import type { RulesetId } from './detectRuleset'

const DB_NAME = 'dnd-companion'
const STORE_NAME = 'handles'
/** Pre-start-page key: the single last-used folder. Migrated into `RECENTS_KEY` on first read. */
const LEGACY_VAULT_KEY = 'vault-dir'
const RECENTS_KEY = 'recent-vaults'
/** How many folders the start page offers to reopen. */
export const MAX_RECENT_VAULTS = 5

/** A previously opened vault folder, as remembered for the start page's "continue" cards. */
export interface RecentVault {
  id: string
  handle: FileSystemDirectoryHandle
  name: string
  openedAt: number
  ruleset?: RulesetId
  characterCount?: number
  /** A few character names, for the card's preview medallions. */
  characters?: string[]
  /** The character sheet visited last, so "continue" can jump straight back to it. */
  lastCharacter?: string
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
    if (recents) return [...recents].sort((a, b) => b.openedAt - a.openedAt)

    const legacy = await withStore<FileSystemDirectoryHandle | undefined>('readonly', (store) => store.get(LEGACY_VAULT_KEY))
    if (!legacy) return []
    const migrated: RecentVault[] = [{ id: newId(), handle: legacy, name: legacy.name, openedAt: Date.now() }]
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

/**
 * Moves `handle` to the front of the recents (adding it if new, merging `meta` into its entry) and
 * returns the entry's id. Persists the handle so it can be reopened on a later visit — the browser
 * still asks to re-grant permission then.
 */
export async function rememberRecentVault(
  handle: FileSystemDirectoryHandle,
  meta: Partial<Omit<RecentVault, 'id' | 'handle'>>,
): Promise<string> {
  const recents = await listRecentVaults()
  let existing: RecentVault | undefined
  for (const r of recents) {
    if (await isSameFolder(r.handle, handle)) {
      existing = r
      break
    }
  }
  const entry: RecentVault = { ...existing, ...meta, id: existing?.id ?? newId(), handle, name: handle.name, openedAt: Date.now() }
  await writeRecents([entry, ...recents.filter((r) => r !== existing)].slice(0, MAX_RECENT_VAULTS))
  return entry.id
}

export async function updateRecentVault(id: string, patch: Partial<Omit<RecentVault, 'id' | 'handle'>>): Promise<void> {
  const recents = await listRecentVaults()
  if (!recents.some((r) => r.id === id)) return
  await writeRecents(recents.map((r) => (r.id === id ? { ...r, ...patch } : r)))
}

export async function forgetRecentVault(id: string): Promise<void> {
  const recents = await listRecentVaults()
  await writeRecents(recents.filter((r) => r.id !== id))
}
