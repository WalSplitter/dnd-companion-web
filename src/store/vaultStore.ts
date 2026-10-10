import { create } from 'zustand'
import { reportError } from './errorLogStore'
import { detectRuleset, type RulesetDetectionResult, type RulesetId } from '../vault/detectRuleset'
import { deriveEquipment, equipmentChangeFields } from '../vault/adapters/nativeCharacter'
import { buildVaultFromRawFiles, parseVaultFiles } from '../vault/parseFrontmatter'
import type { RawFile } from '../vault/rawFile'
import { GitHubError, gitHubVaultKey, gitHubVaultName, type GitHubErrorKind, type GitHubVaultRef } from '../vault/github/githubApi'
import type { GitHubSync, SyncStatus } from '../vault/github/githubSync'
import {
  forgetRecentVault,
  listRecentVaults,
  loadPendingEdits,
  rememberRecentVault,
  savePendingEdits,
  updateRecentVault,
  type RecentVault,
  type RecentVaultSource,
} from '../vault/handleStore'
import {
  isFileSystemAccessSupported,
  readVaultFromDirectoryHandle,
  readVaultFromFileList,
  showVaultDirectoryPicker,
} from '../vault/vaultLoader'
import { buildVaultIndex, type VaultIndex } from '../vault/wikilinks'
import { conditionsPatch, currencyBlockPatch, endeavourInventoryPatch, equipmentPatches, fieldPatch, folderWriter, inventoryPatch, sandboxWriter, type VaultWriter } from '../vault/writeback/persist'
import type { TranslationKey } from '../i18n/useI18n'
import type { CharacterFrontmatter, Currency, EndeavourContainerSlotAssignment, EquipmentChange, FieldWriteTarget, ImageAssets, Vault, VaultSourceFile } from '../vault/types'


/** 'none': nothing opened yet — the start page is showing and there is no vault to render. */
export type VaultSource = 'none' | 'sample' | 'user'
type VaultStatus = 'idle' | 'loading' | 'loaded' | 'error'
/** 'unavailable': nothing to write through (the <input webkitdirectory> fallback for browsers
 * without the File System Access API) — fields stay read-only. The sample vault is always 'granted',
 * but its writer stores nothing (see `sandboxWriter`). For a GitHub vault, 'granted'
 * means the account may push to the repository. */
export type EditPermission = 'unavailable' | 'not-requested' | 'granted' | 'denied'

interface VaultState {
  status: VaultStatus
  source: VaultSource
  vaultName: string | null
  /** The `recents` entry of the open vault (null for the sample vault / the file-list fallback). */
  recentId: string | null
  /** Where the open vault was read from, when that is a GitHub repository. */
  github: GitHubVaultRef | null
  /** Why the last GitHub load failed — the start page explains it next to the form. */
  githubError: GitHubErrorKind | null
  /** Previously opened vault folders, newest first — the start page's "continue" cards. */
  recents: RecentVault[]
  recentsLoaded: boolean
  /** Files read so far / total markdown files found, while `status === 'loading'` from a real folder. */
  loadingProgress: { done: number; total: number } | null
  vault: Vault
  index: VaultIndex
  /** The vault's parsed markdown files, kept for re-deriving a character after an edit changes what
   * its stats depend on (equipping armor or a weapon — see `setEquipment`). */
  rawFiles: RawFile[]
  /** Best-effort guess at which ruleset the loaded vault's content follows — see `detectRuleset.ts`. */
  ruleset: RulesetDetectionResult
  error: string | null
  rootHandle: FileSystemDirectoryHandle | null
  /** Where edits go: the folder's files, or commits to the GitHub repository. Null when read-only. */
  writer: VaultWriter | null
  /** Progress of queued edits towards the GitHub repository (null for any other vault). */
  sync: SyncStatus | null
  editPermission: EditPermission
  /** Set when a field write failed after already being applied optimistically (and then rolled back). */
  writeError: string | null
  /** Opens the bundled sample vault — always in its original state, so this also discards any demo edits.
   * The first call downloads the vault's notes (a separate chunk); every later one switches synchronously. */
  loadSampleVault: () => Promise<boolean>
  /** The load actions resolve `true` once the new vault is showing (false: cancelled, failed or superseded). */
  loadFromDirectoryPicker: () => Promise<boolean>
  /** Opens a folder handle obtained some other way (dragged onto the start page). */
  loadFromDirectoryHandle: (handle: FileSystemDirectoryHandle) => Promise<boolean>
  loadFromFileList: (fileList: FileList) => Promise<boolean>
  /** Reads a vault out of a GitHub repository (read-only) and remembers it, token included, for the start page. */
  loadFromGitHub: (ref: GitHubVaultRef, token: string) => Promise<boolean>
  refreshRecents: () => Promise<void>
  /**
   * Reopens a remembered vault. For a folder this asks the browser to re-grant read access, so it must
   * run from a user gesture — unless `silent`, which only succeeds when access is still granted
   * (deep-link boot). A GitHub vault just loads again with its stored token.
   */
  openRecentVault: (id: string, options?: { silent?: boolean }) => Promise<boolean>
  forgetRecentVault: (id: string) => Promise<void>
  /** Remembers the sheet last looked at in the open vault's recents entry. */
  noteCharacterVisit: (name: string) => void
  /** Drops the open vault and returns to the empty "nothing opened" state. */
  closeVault: () => void
  /** Requests `readwrite` permission on the vault folder — must be called from a direct user gesture.
   * For a GitHub vault, checks that the account may push to the repository. */
  requestEditPermission: () => Promise<void>
  /** Commits the GitHub vault's queued edits now instead of after the quiet period. */
  syncNow: () => Promise<void>
  /**
   * Settles a sync conflict: 'mine' overwrites the repository's values with this browser's, 'theirs'
   * drops this browser's conflicting edits and reloads the vault from the repository.
   */
  resolveSyncConflicts: (choice: 'mine' | 'theirs') => Promise<void>
  /**
   * Applies an optimistic local edit to one character's frontmatter and writes it back to the exact
   * vault file/key `target` points at (see `writeback/`). Rolled back with `writeError` set if the
   * disk write fails (permission revoked, file moved, unrecognized YAML shape, ...). A no-op if
   * `target` is undefined (field has no known write location) or editing isn't currently permitted.
   */
  updateCharacterField: (
    characterPath: string,
    target: FieldWriteTarget | undefined,
    logicalValue: number | boolean,
    mutate: (character: CharacterFrontmatter) => CharacterFrontmatter,
  ) => Promise<void>
  /**
   * Replaces a character's slot-grid inventory (`endeavour_inventory.containers`) — always applied
   * locally first (so rearranging items works even without write permission, same as before), then
   * written back to whichever file owns the field (`CharacterWriteTargets.endeavour_inventory` — the
   * character's own file, or a linked sheet) via `patchFrontmatterBlock`, same optimistic-write +
   * rollback-on-failure shape as `updateCharacterField`. A no-op disk write (stays local-only) when
   * editing isn't permitted, no file handle is known for that path, or the field has no write target
   * yet (a brand-new character with nowhere on disk to place `endeavour_inventory`).
   */
  setEndeavourInventory: (characterPath: string, containers: EndeavourContainerSlotAssignment[]) => Promise<void>
  /**
   * Replaces a character's list inventory (own schema: `inventory.equipped`/`inventory.carried`) —
   * adding, removing and moving items between the two lists. Written as the whole `inventory` block
   * to the file that owns it (`CharacterWriteTargets.inventory`), with the same optimistic-write +
   * rollback shape as `setEndeavourInventory`. No-op without edit permission or a write target.
   */
  setInventory: (characterPath: string, inventory: NonNullable<CharacterFrontmatter['inventory']>) => Promise<void>
  /**
   * Replaces the conditions a character has (`conditions.active`, own schema), with the same
   * optimistic-write + rollback shape as the other writers. No-op without edit permission or a write target.
   */
  setConditions: (characterPath: string, active: string[]) => Promise<void>
  /**
   * Replaces a character's coin purse. Same optimistic-write + rollback shape as the other writers;
   * disk write goes to the whole `currency` block (own schema, `_write.currency_block`) or, for the
   * legacy vault, to each changed `Geld.*` scalar (`_write.currency`). No-op without edit permission.
   */
  setCurrency: (characterPath: string, currency: Currency) => Promise<void>
  /**
   * Equips or unequips armor, a shield or a weapon from the slot-grid inventory: the character's
   * `armor`/`shield`/`attacks` and the inventory's containers change together, and armor class, Max BW
   * and attacks are re-derived right away. Two notes are written (see `EquipmentChange.first`); a
   * failed write rolls the local change back. No-op without edit permission or for a character that
   * has nowhere to store its equipment.
   */
  setEquipment: (characterPath: string, change: EquipmentChange) => Promise<void>
}

// Portrait images are exposed as object URLs (see vaultLoader.ts); each one needs revoking when a
// vault is replaced, or they'd leak for the lifetime of the page across repeated folder reloads.
let activeImageAssets: ImageAssets | null = null

function revokeActiveImageAssets() {
  if (!activeImageAssets) return
  for (const url of activeImageAssets.values()) URL.revokeObjectURL(url)
  activeImageAssets = null
}

type CharacterEditListener = (characterPath: string, character: CharacterFrontmatter) => void
const characterEditListeners = new Set<CharacterEditListener>()

/**
 * Follows every edit made to a character in this browser (and its rollback, should the write fail)
 * — not vault loads. The Owlbear Rodeo live sync uses it to share changes made on the sheet.
 */
export function onCharacterEdit(listener: CharacterEditListener): () => void {
  characterEditListeners.add(listener)
  return () => characterEditListeners.delete(listener)
}

function notifyCharacterEdit(vault: Vault, characterPath: string) {
  const character = findCharacter(vault, characterPath)
  if (character) for (const listener of characterEditListeners) listener(characterPath, character)
}

// The GitHub vault's write-back queue, if one is open. Replaced along with the vault: the old one
// commits what it still holds (or keeps it persisted for the next visit) and stops its timers.
let activeSync: GitHubSync | null = null

function replaceSync(next: GitHubSync | null) {
  if (activeSync && activeSync !== next) {
    void activeSync.flush()
    activeSync.dispose()
  }
  activeSync = next
}

function applyVault(files: VaultSourceFile[], imageAssets?: ImageAssets) {
  revokeActiveImageAssets()
  activeImageAssets = imageAssets ?? null
  const rawFiles = parseVaultFiles(files)
  const vault = buildVaultFromRawFiles(rawFiles, imageAssets)
  return { vault, index: buildVaultIndex(vault), rawFiles, ruleset: detectRuleset(files) }
}

function errorMessage(err: unknown): string {
  if (err instanceof DOMException) return `${err.name}: ${err.message}`
  return err instanceof Error ? err.message : String(err)
}

/** The frontmatter of the character note at `characterPath`, if the vault has one. */
function findCharacter(vault: Vault, characterPath: string): CharacterFrontmatter | undefined {
  return vault.characters.find((c) => c.path === characterPath)?.frontmatter
}

/** Names the character an edit belongs to, for the GitHub commit message. */
function characterContext(vault: Vault, characterPath: string) {
  return { character: findCharacter(vault, characterPath)?.name }
}

/** Returns `vault` with `mutate` applied to one character's frontmatter. */
function mapCharacter(vault: Vault, characterPath: string, mutate: (character: CharacterFrontmatter) => CharacterFrontmatter): Vault {
  return { ...vault, characters: vault.characters.map((c) => (c.path === characterPath ? { ...c, frontmatter: mutate(c.frontmatter) } : c)) }
}

/** The GitHub vault's reader, write-back queue and blob cache — only downloaded once a repository is opened. */
function loadGitHubRuntime() {
  return Promise.all([import('../vault/github/blobCache'), import('../vault/github/githubVaultLoader'), import('../vault/github/githubSync')]).then(
    ([{ openBlobCache }, { readVaultFromGitHub }, { GitHubSync }]) => ({ openBlobCache, readVaultFromGitHub, GitHubSync }),
  )
}

/** State shared by every "a vault is showing" transition that has no folder handles to write through. */
const NO_WRITE_ACCESS = { rootHandle: null, writer: null, sync: null, editPermission: 'unavailable' } as const

const NO_FILES: VaultSourceFile[] = []

/** The error-log hint for a GitHub failure — what it means and what to do. */
function githubHint(err: unknown): TranslationKey {
  return err instanceof GitHubError ? `github.error.${err.kind}` : 'github.sync.failedHint'
}

/** Nothing opened: the store's initial state, so a returning visitor never sees the sample flash by. */
const EMPTY_STATE = (() => {
  const vault = buildVaultFromRawFiles([])
  return {
    status: 'idle',
    source: 'none',
    vaultName: null,
    recentId: null,
    github: null,
    githubError: null,
    loadingProgress: null,
    vault,
    index: buildVaultIndex(vault),
    rawFiles: [] as RawFile[],
    ruleset: detectRuleset(NO_FILES),
    error: null,
    ...NO_WRITE_ACCESS,
    writeError: null,
  } satisfies Partial<VaultState>
})()

type SampleVaultModule = typeof import('../sample-vault')

/** Starts downloading the sample vault's notes ahead of a likely click (hover/focus on its card). */
export function prefetchSampleVault(): void {
  void import('../sample-vault').catch(() => {
    // Only a head start — `loadSampleVault` retries and reports a real failure.
  })
}

/** Editable so visitors can try every control, but through `sandboxWriter`: edits change only the
 * in-memory vault and are gone on reload or the next `loadSampleVault`. */
function buildSampleState({ sampleVaultFiles, sampleVaultImages }: SampleVaultModule) {
  const rawFiles = parseVaultFiles(sampleVaultFiles)
  const vault = buildVaultFromRawFiles(rawFiles, sampleVaultImages)
  return {
    ...EMPTY_STATE,
    status: 'loaded',
    source: 'sample',
    vault,
    index: buildVaultIndex(vault),
    rawFiles,
    ruleset: detectRuleset(sampleVaultFiles),
    writer: sandboxWriter,
    editPermission: 'granted',
  } satisfies Partial<VaultState>
}

/** The bundled demo vault as a complete store state — parsed on first use, reused on every switch back
 * to it. Edits replace the store's `vault`, never this one, so it stays the pristine original. */
let sampleState: ReturnType<typeof buildSampleState> | null = null

/** How many character names a recents entry keeps for its preview medallions. */
const RECENT_PREVIEW_NAMES = 6

/** Bumped by every load; a load whose number is no longer current was superseded and must not apply. */
let loadSeq = 0

export const useVaultStore = create<VaultState>((set, get) => {
  /** Mirrors the GitHub queue's status into the store, and logs a failed sync once (with a retry). */
  function syncStatusChanged(status: SyncStatus) {
    const previous = get().sync
    set({ sync: status })
    if (status.state === 'error' && previous?.state !== 'error') {
      console.error('[vault.githubSync] failed:', status.error)
      reportError({
        titleKey: 'github.sync.failed',
        hintKey: githubHint(status.error),
        source: 'vault.githubSync',
        error: status.error,
        context: { pendingEdits: status.count },
        action: { labelKey: 'errorLog.retry', run: () => void get().syncNow() },
      })
    }
  }

  /** Common failure path of the loaders: a cancelled picker is not an error, and a failed load
   * leaves whatever vault was showing before in place. */
  function loadFailed(source: string, err: unknown) {
    const fallback = get().source === 'none' ? 'idle' : 'loaded'
    if (err instanceof DOMException && err.name === 'AbortError') {
      set({ status: fallback, error: null, loadingProgress: null })
      return
    }
    console.error(`[${source}] failed:`, err)
    const githubError = err instanceof GitHubError ? err.kind : null
    set({ status: get().source === 'none' ? 'error' : 'loaded', error: errorMessage(err), githubError, loadingProgress: null })
    reportError({ titleKey: 'errorLog.loadFailed', hintKey: githubError ? githubHint(err) : 'errorLog.hint.loadFailed', source, error: err })
  }

  /** Remembers a freshly opened vault for the start page (best effort — no IndexedDB, no recents). */
  async function remember(source: RecentVaultSource, vault: Vault, ruleset: RulesetId, isStillOpen: () => boolean) {
    try {
      const names = vault.characters.map((c) => c.frontmatter.name)
      const id = await rememberRecentVault(source, { ruleset, characterCount: names.length, characters: names.slice(0, RECENT_PREVIEW_NAMES) })
      if (isStillOpen()) set({ recentId: id })
      await get().refreshRecents()
    } catch (err) {
      console.error('[vault] remembering the folder failed:', err)
    }
  }

  /** Reads a vault folder (reporting progress) and makes it the active vault, ready for a later edit-permission request. */
  async function loadFromHandle(handle: FileSystemDirectoryHandle, source: string): Promise<boolean> {
    const seq = ++loadSeq
    set({ status: 'loading', error: null, loadingProgress: null })
    try {
      const { files, imageAssets, fileHandles } = await readVaultFromDirectoryHandle(handle, (done, total) => {
        if (seq === loadSeq) set({ loadingProgress: { done, total } })
      })
      if (seq !== loadSeq) return false
      const loaded = applyVault(files, imageAssets)
      set({
        status: 'loaded',
        source: 'user',
        vaultName: handle.name,
        recentId: null,
        github: null,
        loadingProgress: null,
        rootHandle: handle,
        writer: folderWriter(fileHandles),
        sync: null,
        editPermission: 'not-requested',
        writeError: null,
        ...loaded,
      })
      replaceSync(null)
      void remember({ kind: 'folder', handle }, loaded.vault, loaded.ruleset.ruleset, () => get().rootHandle === handle)
      return true
    } catch (err) {
      if (seq === loadSeq) loadFailed(source, err)
      return false
    }
  }

  /** Makes sure read access to a stored/dropped folder is granted — prompting unless `silent`. */
  async function ensureReadAccess(handle: FileSystemDirectoryHandle, silent = false): Promise<boolean> {
    if ((await handle.queryPermission({ mode: 'read' })) === 'granted') return true
    if (silent) return false
    if ((await handle.requestPermission({ mode: 'read' })) === 'granted') return true
    throw new Error('Permission to read the vault folder was denied.')
  }

  /**
   * Applies `mutate` to the character locally, then runs `write` (if any) against disk. If the write
   * fails only that character is rolled back to its previous frontmatter — so a concurrent edit to
   * another character isn't clobbered — and a retryable entry lands in the error log.
   */
  async function editCharacter(
    characterPath: string,
    mutate: (character: CharacterFrontmatter) => CharacterFrontmatter,
    write: (() => Promise<void>) | null,
    failure: { source: string; context?: Record<string, unknown>; retry: () => void },
  ) {
    const previous = findCharacter(get().vault, characterPath)
    set({ vault: mapCharacter(get().vault, characterPath, mutate), writeError: null })
    notifyCharacterEdit(get().vault, characterPath)
    if (!write) return

    try {
      await write()
    } catch (err) {
      console.error(`[${failure.source}] failed, rolling back:`, err)
      reportError({
        titleKey: 'errorLog.saveFailed',
        hintKey: 'errorLog.hint.rolledBack',
        source: failure.source,
        error: err,
        context: failure.context,
        action: { labelKey: 'errorLog.retry', run: failure.retry },
      })
      set({
        vault: previous ? mapCharacter(get().vault, characterPath, () => previous) : get().vault,
        writeError: errorMessage(err),
      })
      notifyCharacterEdit(get().vault, characterPath)
    }
  }

  return {
    ...EMPTY_STATE,
    recents: [],
    recentsLoaded: false,

    loadSampleVault: async () => {
      const seq = ++loadSeq
      if (!sampleState) {
        set({ status: 'loading', error: null, loadingProgress: null })
        try {
          sampleState = buildSampleState(await import('../sample-vault'))
        } catch (err) {
          if (seq === loadSeq) loadFailed('vault.loadSampleVault', err)
          return false
        }
        if (seq !== loadSeq) return false
      }
      replaceSync(null)
      revokeActiveImageAssets()
      set(sampleState)
      return true
    },

    loadFromDirectoryPicker: async () => {
      let handle: FileSystemDirectoryHandle
      try {
        handle = await showVaultDirectoryPicker()
      } catch (err) {
        loadFailed('vault.loadFromDirectoryPicker', err)
        return false
      }
      return loadFromHandle(handle, 'vault.loadFromDirectoryPicker')
    },

    loadFromDirectoryHandle: async (handle) => {
      try {
        await ensureReadAccess(handle)
      } catch (err) {
        loadFailed('vault.loadFromDirectoryHandle', err)
        return false
      }
      return loadFromHandle(handle, 'vault.loadFromDirectoryHandle')
    },

    loadFromFileList: async (fileList: FileList) => {
      const seq = ++loadSeq
      set({ status: 'loading', error: null, loadingProgress: null })
      try {
        const { files, imageAssets } = await readVaultFromFileList(fileList)
        if (seq !== loadSeq) return false
        replaceSync(null)
        set({
          status: 'loaded',
          source: 'user',
          vaultName: files[0]?.path.split('/')[0] ?? null,
          recentId: null,
          github: null,
          loadingProgress: null,
          ...NO_WRITE_ACCESS,
          writeError: null,
          ...applyVault(files, imageAssets),
        })
        return true
      } catch (err) {
        if (seq === loadSeq) loadFailed('vault.loadFromFileList', err)
        return false
      }
    },

    loadFromGitHub: async (ref, token) => {
      const seq = ++loadSeq
      set({ status: 'loading', error: null, githubError: null, loadingProgress: null })
      try {
        const { openBlobCache, readVaultFromGitHub, GitHubSync } = await loadGitHubRuntime()
        const cache = await openBlobCache()
        const { files, imageAssets, snapshot } = await readVaultFromGitHub(token, ref, {
          cache,
          onProgress: (done, total) => {
            if (seq === loadSeq) set({ loadingProgress: { done, total } })
          },
        })
        if (seq !== loadSeq) return false
        // Remember the branch that was actually read, so "default branch" can't silently switch later.
        const github = { ...ref, branch: snapshot.branch }
        // Edits from an earlier visit that never reached the repository are shown, and committed, again.
        const restored = await loadPendingEdits(github)
        if (seq !== loadSeq) return false

        const sync: GitHubSync = new GitHubSync({
          token,
          ref: github,
          commitSha: snapshot.commitSha,
          contents: new Map(files.map((f) => [f.path, f.content])),
          restored,
          persist: (edits) => savePendingEdits(github, edits),
          onStatus: (status) => {
            if (activeSync === sync) syncStatusChanged(status)
          },
        })
        const localFiles = restored.length > 0 ? files.map((f) => ({ ...f, content: sync.localContent(f.path) ?? f.content })) : files
        const loaded = applyVault(localFiles, imageAssets)
        // Reloading the same repository (e.g. after a conflict) keeps edit mode on.
        const current = get()
        const stillEditing = current.github !== null && gitHubVaultKey(current.github) === gitHubVaultKey(github) && current.editPermission === 'granted'
        replaceSync(sync)
        set({
          status: 'loaded',
          source: 'user',
          vaultName: gitHubVaultName(github),
          recentId: null,
          github,
          loadingProgress: null,
          rootHandle: null,
          writer: sync,
          sync: sync.status,
          editPermission: stillEditing ? 'granted' : 'not-requested',
          writeError: null,
          ...loaded,
        })
        sync.start()
        // Unlike a folder, a repository needs no click to grant writing: whether the token may push is
        // asked right away, and editing is on if it may.
        if (!stillEditing) void get().requestEditPermission()
        void remember({ kind: 'github', github, token }, loaded.vault, loaded.ruleset.ruleset, () => get().github === github)
        return true
      } catch (err) {
        if (seq === loadSeq) loadFailed('vault.loadFromGitHub', err)
        return false
      }
    },

    refreshRecents: async () => {
      // Folder handles can only be reopened where the File System Access API exists; GitHub vaults anywhere.
      const recents = await listRecentVaults()
      set({ recents: isFileSystemAccessSupported() ? recents : recents.filter((r) => r.kind === 'github'), recentsLoaded: true })
    },

    openRecentVault: async (id, options) => {
      if (!get().recentsLoaded) await get().refreshRecents()
      const recent = get().recents.find((r) => r.id === id)
      if (!recent) return false
      if (recent.kind === 'github') return get().loadFromGitHub(recent.github, recent.token)
      try {
        if (!(await ensureReadAccess(recent.handle, options?.silent))) return false
      } catch (err) {
        loadFailed('vault.openRecentVault', err)
        return false
      }
      return loadFromHandle(recent.handle, 'vault.openRecentVault')
    },

    forgetRecentVault: async (id) => {
      await forgetRecentVault(id).catch(() => {})
      if (get().recentId === id) set({ recentId: null })
      await get().refreshRecents()
    },

    noteCharacterVisit: (name) => {
      const { recentId, recents } = get()
      if (!recentId || recents.find((r) => r.id === recentId)?.lastCharacter === name) return
      set({ recents: recents.map((r) => (r.id === recentId ? { ...r, lastCharacter: name } : r)) })
      void updateRecentVault(recentId, { lastCharacter: name }).catch(() => {})
    },

    closeVault: () => {
      loadSeq++
      replaceSync(null)
      revokeActiveImageAssets()
      set(EMPTY_STATE)
    },

    requestEditPermission: async () => {
      const sync = activeSync
      if (sync && get().writer === sync) {
        try {
          set({ editPermission: (await sync.canPush()) ? 'granted' : 'denied' })
        } catch (err) {
          console.error('[vault] checking push access failed:', err)
          set({ editPermission: 'denied' })
          reportError({ titleKey: 'github.sync.permissionFailed', hintKey: githubHint(err), source: 'vault.requestEditPermission', error: err })
        }
        return
      }
      const { rootHandle } = get()
      if (!rootHandle) return
      try {
        const result = await rootHandle.requestPermission({ mode: 'readwrite' })
        set({ editPermission: result === 'granted' ? 'granted' : 'denied' })
      } catch (err) {
        console.error('[vault] requestEditPermission failed:', err)
        set({ editPermission: 'denied' })
      }
    },

    syncNow: async () => {
      await activeSync?.flush()
    },

    resolveSyncConflicts: async (choice) => {
      const sync = activeSync
      if (!sync) return
      await sync.resolveConflicts(choice)
      if (choice === 'theirs') await get().loadFromGitHub(sync.source.ref, sync.source.token)
    },

    updateCharacterField: async (characterPath, target, logicalValue, mutate) => {
      if (!target) return
      const { writer, editPermission } = get()
      if (editPermission !== 'granted' || !writer?.canWrite(target.path)) return

      const context = characterContext(get().vault, characterPath)
      await editCharacter(characterPath, mutate, () => writer.write(target.path, fieldPatch(target, logicalValue), context), {
        source: 'vault.updateCharacterField',
        context: { characterPath, target, value: logicalValue },
        retry: () => void get().updateCharacterField(characterPath, target, logicalValue, mutate),
      })
    },

    setEndeavourInventory: async (characterPath, containers) => {
      const { vault, writer, editPermission } = get()
      const target = findCharacter(vault, characterPath)?._write?.endeavour_inventory
      const canWrite = editPermission === 'granted' && target !== undefined && writer?.canWrite(target.path)

      await editCharacter(
        characterPath,
        (c) => ({ ...c, endeavour_inventory: { containers } }),
        // Local-only (no write) when editing isn't permitted or the field has no file to go to.
        canWrite && writer && target ? () => writer.write(target.path, endeavourInventoryPatch(containers), characterContext(vault, characterPath)) : null,
        {
          source: 'vault.setEndeavourInventory',
          context: { characterPath, writePath: target?.path, containers },
          retry: () => void get().setEndeavourInventory(characterPath, containers),
        },
      )
    },

    setInventory: async (characterPath, inventory) => {
      const { vault, writer, editPermission } = get()
      const target = findCharacter(vault, characterPath)?._write?.inventory
      if (editPermission !== 'granted' || !target || !writer?.canWrite(target.path)) return

      await editCharacter(
        characterPath,
        (c) => ({ ...c, inventory }),
        () => writer.write(target.path, inventoryPatch(inventory), characterContext(vault, characterPath)),
        {
          source: 'vault.setInventory',
          context: { characterPath, writePath: target.path, inventory },
          retry: () => void get().setInventory(characterPath, inventory),
        },
      )
    },

    setConditions: async (characterPath, active) => {
      const { vault, writer, editPermission } = get()
      const target = findCharacter(vault, characterPath)?._write?.conditions_active
      if (editPermission !== 'granted' || !target || !writer?.canWrite(target.path)) return

      await editCharacter(
        characterPath,
        (c) => ({ ...c, conditions: { ...c.conditions, active } }),
        () => writer.write(target.path, conditionsPatch(active), characterContext(vault, characterPath)),
        {
          source: 'vault.setConditions',
          context: { characterPath, writePath: target.path, active },
          retry: () => void get().setConditions(characterPath, active),
        },
      )
    },

    setCurrency: async (characterPath, currency) => {
      const { vault, writer, editPermission } = get()
      if (editPermission !== 'granted' || !writer) return
      const character = findCharacter(vault, characterPath)
      const targets = character?._write
      if (!character || !targets) return
      const previous = character.currency ?? {}
      const context = characterContext(vault, characterPath)

      async function write() {
        if (!writer) return
        if (targets?.currency_block) {
          await writer.write(targets.currency_block.path, currencyBlockPatch(currency), context)
        } else if (targets?.currency) {
          for (const [coin, target] of Object.entries(targets.currency) as [keyof Currency, FieldWriteTarget][]) {
            if ((currency[coin] ?? 0) === (previous[coin] ?? 0)) continue
            await writer.write(target.path, fieldPatch(target, currency[coin] ?? 0), context)
          }
        }
      }

      await editCharacter(characterPath, (c) => ({ ...c, currency }), write, {
        source: 'vault.setCurrency',
        context: { characterPath, previous, next: currency, writeTargets: { currency_block: targets.currency_block, currency: targets.currency } },
        retry: () => void get().setCurrency(characterPath, currency),
      })
    },

    setEquipment: async (characterPath, change) => {
      const { vault, writer, editPermission, rawFiles } = get()
      const targets = findCharacter(vault, characterPath)?._write
      const equipmentTarget = targets?.equipment
      const inventoryTarget = change.containers ? targets?.endeavour_inventory : undefined
      if (editPermission !== 'granted' || !equipmentTarget || (change.containers && !inventoryTarget)) return
      const canWrite = writer?.canWrite(equipmentTarget.path) && (!inventoryTarget || writer.canWrite(inventoryTarget.path))
      const context = characterContext(vault, characterPath)
      const { first, containers, ...fields } = change

      function mutate(c: CharacterFrontmatter): CharacterFrontmatter {
        const next: CharacterFrontmatter = {
          ...c,
          ...equipmentChangeFields(change),
          ...(containers ? { endeavour_inventory: { containers } } : {}),
        }
        return { ...next, ...deriveEquipment(next, rawFiles) }
      }

      async function write() {
        if (!writer || !equipmentTarget) return
        const writeCharacter = async () => {
          for (const patch of equipmentPatches(fields)) await writer.write(equipmentTarget.path, patch, context)
        }
        const writeInventory = async () => {
          if (containers && inventoryTarget) await writer.write(inventoryTarget.path, endeavourInventoryPatch(containers), context)
        }
        if (first === 'character') {
          await writeCharacter()
          await writeInventory()
        } else {
          await writeInventory()
          await writeCharacter()
        }
      }

      await editCharacter(characterPath, mutate, canWrite ? write : null, {
        source: 'vault.setEquipment',
        context: { characterPath, change },
        retry: () => void get().setEquipment(characterPath, change),
      })
    },
  }
})

/** Which vault source this tab showed last, so a reload reopens the sample vault instead of jumping
 * to the most recent real vault. Per tab (sessionStorage): a fresh tab still picks up the last real vault. */
const ACTIVE_SOURCE_KEY = 'dnd-companion-active-source'

useVaultStore.subscribe((state, previous) => {
  if (state.source === previous.source) return
  try {
    if (state.source === 'none') sessionStorage.removeItem(ACTIVE_SOURCE_KEY)
    else sessionStorage.setItem(ACTIVE_SOURCE_KEY, state.source)
  } catch {
    // sessionStorage unavailable — a reload then falls back to the most recent real vault.
  }
})

/** Whether this tab had the sample vault open before the page was reloaded. */
export function wasSampleVaultActive(): boolean {
  try {
    return sessionStorage.getItem(ACTIVE_SOURCE_KEY) === 'sample'
  } catch {
    return false
  }
}

/** Whether the sample vault is open and differs from its original state (a demo edit was made). */
export function useSampleVaultEdited(): boolean {
  return useVaultStore((s) => s.source === 'sample' && sampleState !== null && s.vault !== sampleState.vault)
}
