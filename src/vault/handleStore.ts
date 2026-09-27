import type { RulesetId } from './detectRuleset'
import { gitHubVaultKey, gitHubVaultName, type GitHubVaultRef } from './github/githubApi'
import type { PendingEdit } from './github/githubSync'

const DB_NAME = 'dnd-companion'
const STORE_NAME = 'handles'
/** Pre-start-page key: the single last-used folder. Migrated into `RECENTS_KEY` on first read. */
const LEGACY_VAULT_KEY = 'vault-dir'
const RECENTS_KEY = 'recent-vaults'
/** Prefix of the per-repository queue of edits not yet committed — see `github/githubSync.ts`. */
const PENDING_EDITS_PREFIX = 'github-pending:'
/** How many folders the start page offers to reopen. */
export const MAX_RECENT_VAULTS = 5

/** What the start page remembers about any previously opened vault, whatever its source. */
interface RecentVaultBase {
  id: string
  name: string
  openedAt: number
  ruleset?: RulesetId
  characterCount?: number
  /** A few character names, for the card's preview medallions. */
  characters?: string[]
  /** The character sheet visited last, so "continue" can jump straight back to it. */
  lastCharacter?: string
}

/** A local vault folder. The browser asks to re-grant access to the stored handle on reopening. */
export interface RecentFolderVault extends RecentVaultBase {
  kind: 'folder'
  handle: FileSystemDirectoryHandle
}

/** A vault read from a GitHub repository. Its token is kept with it (in this browser only), so reopening
 * needs no re-entry — and removing the entry from the list forgets the token too. */
export interface RecentGitHubVault extends RecentVaultBase {
  kind: 'github'
  github: GitHubVaultRef
  token: string
}

export type RecentVault = RecentFolderVault | RecentGitHubVault

/** How a vault being remembered was opened — everything except the bookkeeping the store adds. */
export type RecentVaultSource = Pick<RecentFolderVault, 'kind' | 'handle'> | Pick<RecentGitHubVault, 'kind' | 'github' | 'token'>

/** Metadata about a vault's contents, updated as it's used. */
export type RecentVaultMeta = Partial<Omit<RecentVaultBase, 'id' | 'name'>>

/** Entries stored before GitHub vaults existed have no `kind` — they're all folders. */
function normalize(entry: RecentVault | (Omit<RecentFolderVault, 'kind'> & { kind?: undefined })): RecentVault {
  return entry.kind ? entry : { ...entry, kind: 'folder' }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode)
      const req = fn(tx.objectStore(STORE_NAME))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function writeRecents(recents: RecentVault[]): Promise<void> {
  await withStore('readwrite', (store) => store.put(recents, RECENTS_KEY))
}

/** Remembered vault folders, newest first. Never throws — no IndexedDB just means no recents. */
export async function listRecentVaults(): Promise<RecentVault[]> {
  try {
    const recents = await withStore<RecentVault[] | undefined>('readonly', (store) => store.get(RECENTS_KEY))
    if (recents) return recents.map(normalize).sort((a, b) => b.openedAt - a.openedAt)

    const legacy = await withStore<FileSystemDirectoryHandle | undefined>('readonly', (store) => store.get(LEGACY_VAULT_KEY))
    if (!legacy) return []
    const migrated: RecentVault[] = [{ kind: 'folder', id: newId(), handle: legacy, name: legacy.name, openedAt: Date.now() }]
    await writeRecents(migrated)
    await withStore('readwrite', (store) => store.delete(LEGACY_VAULT_KEY))
    return migrated
  } catch {
    return []
  }
}

async function isSameFolder(a: FileSystemDirectoryHandle, b: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return await a.isSameEntry(b)
  } catch {
    return false
  }
}

async function isSameVault(recent: RecentVault, source: RecentVaultSource): Promise<boolean> {
  if (recent.kind === 'folder' && source.kind === 'folder') return isSameFolder(recent.handle, source.handle)
  if (recent.kind === 'github' && source.kind === 'github') return gitHubVaultKey(recent.github) === gitHubVaultKey(source.github)
  return false
}

/**
 * Moves the vault to the front of the recents (adding it if new, merging `meta` into its entry) and
 * returns the entry's id. Persists the folder handle / repository and token so it can be reopened on
 * a later visit — for a folder, the browser still asks to re-grant permission then.
 */
export async function rememberRecentVault(source: RecentVaultSource, meta: RecentVaultMeta): Promise<string> {
  const recents = await listRecentVaults()
  let existing: RecentVault | undefined
  for (const r of recents) {
    if (await isSameVault(r, source)) {
      existing = r
      break
    }
  }
  const name = source.kind === 'folder' ? source.handle.name : gitHubVaultName(source.github)
  const entry = { ...existing, ...meta, ...source, id: existing?.id ?? newId(), name, openedAt: Date.now() } as RecentVault
  await writeRecents([entry, ...recents.filter((r) => r !== existing)].slice(0, MAX_RECENT_VAULTS))
  return entry.id
}

export async function updateRecentVault(id: string, patch: RecentVaultMeta): Promise<void> {
  const recents = await listRecentVaults()
  if (!recents.some((r) => r.id === id)) return
  await writeRecents(recents.map((r) => (r.id === id ? { ...r, ...patch } : r)))
}

export async function forgetRecentVault(id: string): Promise<void> {
  const recents = await listRecentVaults()
  await writeRecents(recents.filter((r) => r.id !== id))
}

/** Edits made to a GitHub vault that haven't reached the repository yet (empty when none). */
export async function loadPendingEdits(ref: GitHubVaultRef): Promise<PendingEdit[]> {
  try {
    return (await withStore<PendingEdit[] | undefined>('readonly', (store) => store.get(PENDING_EDITS_PREFIX + gitHubVaultKey(ref)))) ?? []
  } catch {
    return []
  }
}

export async function savePendingEdits(ref: GitHubVaultRef, edits: PendingEdit[]): Promise<void> {
  const key = PENDING_EDITS_PREFIX + gitHubVaultKey(ref)
  if (edits.length > 0) await withStore('readwrite', (store) => store.put(edits, key))
  else await withStore('readwrite', (store) => store.delete(key))
}
