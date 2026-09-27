/**
 * Git blobs are content-addressed, so a blob fetched once never changes: keeping them by SHA lets a
 * reload of a GitHub vault download only the files that changed since the last visit. Lives in its
 * own IndexedDB database, apart from the recents in `handleStore.ts`.
 */
export interface BlobCache {
  get(sha: string): Promise<ArrayBuffer | undefined>
  put(sha: string, data: ArrayBuffer): Promise<void>
  /** Drops every blob not in `shas` — called with the files of the vault just loaded. */
  retainOnly(shas: ReadonlySet<string>): Promise<void>
}

const DB_NAME = 'dnd-companion-github-blobs'
const STORE_NAME = 'blobs'

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * The browser's blob cache, or `null` without IndexedDB. Only one GitHub vault's blobs are kept at a
 * time (`retainOnly` after each load) — switching between two GitHub vaults costs a full download,
 * but the cache never grows past one vault.
 */
export async function openBlobCache(): Promise<BlobCache | null> {
  if (typeof indexedDB === 'undefined') return null
  let db: IDBDatabase
  try {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    db = await promisify(req)
  } catch {
    return null
  }
  const store = (mode: IDBTransactionMode) => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)

  // Every failure just means "not cached" — the blob is fetched from GitHub instead.
  return {
    get: async (sha) => {
      try {
        return await promisify<ArrayBuffer | undefined>(store('readonly').get(sha))
      } catch {
        return undefined
      }
    },
    put: async (sha, data) => {
      try {
        await promisify(store('readwrite').put(data, sha))
      } catch {
        // Quota exceeded or similar — skip caching.
      }
    },
    retainOnly: async (shas) => {
      try {
        const keys = (await promisify(store('readonly').getAllKeys())) as string[]
        const stale = keys.filter((key) => !shas.has(key))
        if (stale.length === 0) return
        const tx = db.transaction(STORE_NAME, 'readwrite')
        for (const key of stale) tx.objectStore(STORE_NAME).delete(key)
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      } catch {
        // Stale blobs just stay until the next load.
      }
    },
  }
}

/** In-memory stand-in for tests. */
export function memoryBlobCache(initial: Iterable<[string, ArrayBuffer]> = []): BlobCache & { entries: Map<string, ArrayBuffer> } {
  const entries = new Map(initial)
  return {
    entries,
    get: async (sha) => entries.get(sha),
    put: async (sha, data) => void entries.set(sha, data),
    retainOnly: async (shas) => {
      for (const key of [...entries.keys()]) if (!shas.has(key)) entries.delete(key)
    },
  }
}
