import { applyPatch, readFrontmatterValue, type FrontmatterPatch, type VaultWriter, type WriteContext } from '../writeback/persist'
import { commitMessage } from './commitMessage'
import {
  commitFiles,
  fetchBranchHead,
  fetchCanPush,
  fetchFileAt,
  fetchLogin,
  GitHubError,
  type GitHubErrorKind,
  type GitHubVaultRef,
} from './githubApi'

/**
 * A queued edit to one frontmatter key: the latest patch for it, and `base` — the value the repository
 * had there before the first local edit. Plain data, so the queue survives a closed tab.
 */
export interface PendingEdit {
  path: string
  patch: FrontmatterPatch
  base: unknown
  /** Character the edit belongs to, for the commit message. */
  character?: string
}

/** A key both this browser and someone else changed since it was loaded. */
export interface SyncConflict {
  path: string
  keyPath: string[]
  /** Value before either change. */
  base: unknown
  /** Value in the repository now (`undefined` when the key or the whole file is gone). */
  theirs: unknown
  /** Value this browser wants to write. */
  mine: unknown
  /** The whole note was deleted or moved in the repository. */
  fileGone?: boolean
}

export type SyncStatus =
  | { state: 'synced' }
  | { state: 'pending' | 'syncing'; count: number }
  | { state: 'error'; count: number; kind: GitHubErrorKind | null; error: unknown }
  | { state: 'conflict'; count: number; conflicts: SyncConflict[] }

export interface GitHubSyncOptions {
  token: string
  /** With the branch resolved (never empty). */
  ref: GitHubVaultRef
  /** Commit the `contents` were read at. */
  commitSha: string
  /** Vault path -> note text, as of `commitSha`. */
  contents: Map<string, string>
  /** Edits queued in an earlier session that never reached the repository. */
  restored?: PendingEdit[]
  /** Called with the whole queue whenever it changes, to keep it across reloads. */
  persist?: (edits: PendingEdit[]) => Promise<void>
  onStatus?: (status: SyncStatus) => void
  /** Quiet time after the last edit before it is committed (default: 5 minutes). */
  delayMs?: number
}

/** Equality of YAML-ish values, ignoring key order and `undefined` properties. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keys = (o: object) => Object.keys(o).filter((k) => (o as Record<string, unknown>)[k] !== undefined)
  const ka = keys(a)
  return ka.length === keys(b).length && ka.every((k) => sameValue((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

const keyOf = (keyPath: string[]) => keyPath.join('\u0000')

/** How often a commit is retried when the branch moved between reading its head and updating it. */
const MAX_ATTEMPTS = 3

/**
 * Write-back for a vault read from GitHub. Edits apply locally at once and queue up; after `delayMs`
 * without another edit — or when the page is hidden, or on `flush()` — everything queued goes to the
 * repository as a single commit (several files at once through the Git data API).
 *
 * Commits are built on the branch's *current* head, not the one loaded: each edited note is re-read at
 * that head and the queued key patches are applied to it, so a teammate's changes to other keys or
 * files are kept. Only when the same key changed on both sides does it stop and report a conflict —
 * nobody's change is overwritten silently.
 */
export class GitHubSync implements VaultWriter {
  private readonly options: GitHubSyncOptions
  /** Each note's latest known repository text, and the commit it's known to be current at. */
  private readonly remote = new Map<string, { content: string; commit: string }>()
  /** path -> key -> edit, in edit order. */
  private readonly edits = new Map<string, Map<string, PendingEdit>>()
  private conflicts: SyncConflict[] = []
  private failure: unknown = null
  private running: Promise<void> | null = null
  private rerun = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private detach: (() => void) | null = null
  /** The account's login for the commit message — asked once; `null` when GitHub wouldn't say. */
  private login: Promise<string | null> | null = null

  constructor(options: GitHubSyncOptions) {
    this.options = options
    for (const [path, content] of options.contents) this.remote.set(path, { content, commit: options.commitSha })
    for (const edit of options.restored ?? []) {
      if (!this.remote.has(edit.path)) continue
      const fileEdits = this.edits.get(edit.path) ?? new Map<string, PendingEdit>()
      fileEdits.set(keyOf(edit.patch.keyPath), edit)
      this.edits.set(edit.path, fileEdits)
    }
  }

  /** The repository (branch resolved) and token this writes to — what a reload of the vault needs. */
  get source(): { ref: GitHubVaultRef; token: string } {
    return { ref: this.options.ref, token: this.options.token }
  }

  get pendingCount(): number {
    let n = 0
    for (const fileEdits of this.edits.values()) n += fileEdits.size
    return n
  }

  get status(): SyncStatus {
    const count = this.pendingCount
    if (this.running) return { state: 'syncing', count }
    if (this.conflicts.length > 0) return { state: 'conflict', count, conflicts: this.conflicts }
    if (this.failure) return { state: 'error', count, kind: this.failure instanceof GitHubError ? this.failure.kind : null, error: this.failure }
    return count > 0 ? { state: 'pending', count } : { state: 'synced' }
  }

  /** A note's text as this browser sees it: the repository's version plus every queued edit that fits. */
  localContent(path: string): string | undefined {
    const remote = this.remote.get(path)
    if (!remote) return undefined
    let content = remote.content
    for (const edit of this.edits.get(path)?.values() ?? []) {
      try {
        content = applyPatch(content, edit.patch)
      } catch {
        // Doesn't fit the repository's version any more — reported as a conflict on the next sync.
      }
    }
    return content
  }

  canWrite(path: string): boolean {
    return this.remote.has(path)
  }

  async write(path: string, patch: FrontmatterPatch, context?: WriteContext): Promise<void> {
    const remote = this.remote.get(path)
    if (!remote) throw new Error(`no such note in the repository: ${path}`)
    // Throws (so the store rolls the edit back) when the note doesn't have the shape the patch expects.
    applyPatch(this.localContent(path)!, patch)

    const key = keyOf(patch.keyPath)
    const fileEdits = this.edits.get(path) ?? new Map<string, PendingEdit>()
    const previous = fileEdits.get(key)
    const base = previous ? previous.base : readFrontmatterValue(remote.content, patch.keyPath)
    fileEdits.delete(key) // re-inserted last, keeping edit order
    // Changed back to what the repository has — nothing left to commit for this key.
    const character = context?.character ?? previous?.character
    if (!sameValue(patch.value, base)) fileEdits.set(key, { path, patch, base, ...(character && { character }) })
    if (fileEdits.size > 0) this.edits.set(path, fileEdits)
    else this.edits.delete(path)

    void this.changed()
    this.schedule()
  }

  /** Commits whatever is queued right now (after any sync already running). */
  flush(): Promise<void> {
    clearTimeout(this.timer)
    if (this.running) {
      this.rerun = true
      return this.running
    }
    if (this.pendingCount === 0 || this.conflicts.length > 0) return Promise.resolve()

    this.failure = null
    this.running = this.sync()
      .catch((err: unknown) => {
        this.failure = err
      })
      .finally(() => {
        this.running = null
        this.emit()
        if (this.rerun) {
          this.rerun = false
          void this.flush()
        }
      })
    this.emit()
    return this.running
  }

  /**
   * Settles the reported conflicts. 'mine' writes this browser's values over the repository's;
   * 'theirs' drops this browser's edits to the conflicting keys (the caller then reloads the vault).
   */
  async resolveConflicts(choice: 'mine' | 'theirs'): Promise<void> {
    for (const conflict of this.conflicts) {
      const fileEdits = this.edits.get(conflict.path)
      const edit = fileEdits?.get(keyOf(conflict.keyPath))
      if (!fileEdits || !edit) continue
      const fileGone = !this.remote.has(conflict.path)
      if (choice === 'mine' && !fileGone) edit.base = conflict.theirs
      else fileEdits.delete(keyOf(conflict.keyPath))
      if (fileEdits.size === 0) this.edits.delete(conflict.path)
    }
    this.conflicts = []
    await this.changed()
    if (choice === 'mine') await this.flush()
  }

  /** Whether the token's account may push — checked when edit mode is switched on. */
  canPush(): Promise<boolean> {
    return fetchCanPush(this.options.token, this.options.ref)
  }

  /** Commits on page hide (the tab may not come back) and when the connection returns. */
  start(): void {
    if (this.detach || typeof window === 'undefined') return
    const onHide = () => {
      if (document.visibilityState === 'hidden') void this.flush()
    }
    const onOnline = () => void this.flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    window.addEventListener('online', onOnline)
    this.detach = () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('online', onOnline)
    }
    if (this.pendingCount > 0) void this.flush()
  }

  /** Stops the timers and listeners (a sync already running still finishes). Queued edits stay persisted. */
  dispose(): void {
    clearTimeout(this.timer)
    this.detach?.()
    this.detach = null
  }

  private schedule() {
    clearTimeout(this.timer)
    if (this.conflicts.length === 0) this.timer = setTimeout(() => void this.flush(), this.options.delayMs ?? 5 * 60_000)
    this.emit()
  }

  private emit() {
    this.options.onStatus?.(this.status)
  }

  private allEdits(): PendingEdit[] {
    return [...this.edits.values()].flatMap((fileEdits) => [...fileEdits.values()])
  }

  private async changed() {
    this.emit()
    try {
      await this.options.persist?.(this.allEdits())
    } catch (err) {
      console.error('[github] keeping the pending edits failed:', err)
    }
  }

  /** The note's text at `commit` — from memory when already known to be current there, else fetched. */
  private async remoteAt(path: string, commit: string): Promise<string | null> {
    const known = this.remote.get(path)
    if (known?.commit === commit) return known.content
    const content = await fetchFileAt(this.options.token, this.options.ref, path, commit)
    if (content === null) this.remote.delete(path)
    else this.remote.set(path, { content, commit })
    return content
  }

  private async sync(): Promise<void> {
    const { token, ref } = this.options
    for (let attempt = 1; ; attempt++) {
      const head = await fetchBranchHead(token, ref, ref.branch)
      const batch = this.allEdits()
      const files = new Map<string, string>()
      const conflicts: SyncConflict[] = []

      for (const path of new Set(batch.map((e) => e.path))) {
        const edits = batch.filter((e) => e.path === path)
        const remote = await this.remoteAt(path, head.commitSha)
        if (remote === null) {
          conflicts.push(...edits.map((e) => ({ path, keyPath: e.patch.keyPath, base: e.base, theirs: undefined, mine: e.patch.value, fileGone: true })))
          continue
        }
        let content = remote
        for (const edit of edits) {
          const theirs = readFrontmatterValue(content, edit.patch.keyPath)
          const conflict = { path, keyPath: edit.patch.keyPath, base: edit.base, theirs, mine: edit.patch.value }
          if (!sameValue(theirs, edit.base) && !sameValue(theirs, edit.patch.value)) {
            conflicts.push(conflict)
            continue
          }
          try {
            content = applyPatch(content, edit.patch)
          } catch {
            conflicts.push(conflict) // someone restructured the note so the key can't be patched any more
          }
        }
        if (content !== remote) files.set(path, content)
      }

      if (conflicts.length > 0) {
        this.conflicts = conflicts
        return
      }
      let commit = head.commitSha
      if (files.size > 0) {
        try {
          this.login ??= fetchLogin(token).catch(() => null)
          commit = await commitFiles(token, ref, ref.branch, head, files, commitMessage(batch, await this.login))
        } catch (err) {
          // Someone pushed between reading the head and moving the branch — rebuild on the new head.
          if (err instanceof GitHubError && err.kind === 'not-fast-forward' && attempt < MAX_ATTEMPTS) continue
          throw err
        }
      }
      for (const [path, content] of files) this.remote.set(path, { content, commit })
      this.settle(batch)
      return
    }
  }

  /** Drops the committed edits — except keys edited again meanwhile, which now build on the committed value. */
  private settle(committed: PendingEdit[]) {
    for (const edit of committed) {
      const fileEdits = this.edits.get(edit.path)
      const key = keyOf(edit.patch.keyPath)
      const current = fileEdits?.get(key)
      if (!fileEdits || !current) continue
      if (current === edit) fileEdits.delete(key)
      else current.base = edit.patch.value
      if (fileEdits.size === 0) this.edits.delete(edit.path)
    }
    void this.changed()
  }
}
