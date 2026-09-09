const DB_NAME = 'dnd-companion'
const STORE_NAME = 'handles'
const VAULT_KEY = 'vault-dir'

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

/** Persists the vault directory handle so it can be reconnected to on the next visit (still requires the browser to re-grant permission). */
export async function saveVaultHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await withStore('readwrite', (store) => store.put(handle, VAULT_KEY))
}

export async function loadVaultHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    return await withStore('readonly', (store) => store.get(VAULT_KEY))
  } catch {
    return undefined
  }
}

export async function clearVaultHandle(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(VAULT_KEY))
}
