import { create } from 'zustand'
import { sampleVaultFiles } from '../sample-vault'
import { buildVault } from '../vault/parseFrontmatter'
import { clearVaultHandle, loadVaultHandle, saveVaultHandle } from '../vault/handleStore'
import {
  isFileSystemAccessSupported,
  readVaultFromDirectoryHandle,
  readVaultFromFileList,
  showVaultDirectoryPicker,
} from '../vault/vaultLoader'
import { buildVaultIndex, type VaultIndex } from '../vault/wikilinks'
import type { Vault } from '../vault/types'

const SAMPLE_VAULT = buildVault(sampleVaultFiles)

export type VaultSource = 'sample' | 'user'
type VaultStatus = 'loading' | 'loaded' | 'error'

interface VaultState {
  status: VaultStatus
  source: VaultSource
  vaultName: string | null
  /** Set when a previously used vault folder was found on disk but needs a user gesture to re-grant read access. */
  reconnectName: string | null
  vault: Vault
  index: VaultIndex
  error: string | null
  loadSampleVault: () => void
  loadFromDirectoryPicker: () => Promise<void>
  loadFromFileList: (fileList: FileList) => Promise<void>
  restoreLastVault: () => Promise<void>
  reconnectVault: () => Promise<void>
  forgetVault: () => Promise<void>
}

function applyVault(files: { path: string; content: string }[]) {
  const vault = buildVault(files)
  return { vault, index: buildVaultIndex(vault) }
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'loaded',
  source: 'sample',
  vaultName: null,
  reconnectName: null,
  vault: SAMPLE_VAULT,
  index: buildVaultIndex(SAMPLE_VAULT),
  error: null,

  loadSampleVault: () => {
    set({
      status: 'loaded',
      source: 'sample',
      vaultName: null,
      reconnectName: null,
      vault: SAMPLE_VAULT,
      index: buildVaultIndex(SAMPLE_VAULT),
      error: null,
    })
    void clearVaultHandle()
  },

  loadFromDirectoryPicker: async () => {
    set({ status: 'loading', error: null })
    try {
      const handle = await showVaultDirectoryPicker()
      const files = await readVaultFromDirectoryHandle(handle)
      set({ status: 'loaded', source: 'user', vaultName: handle.name, reconnectName: null, ...applyVault(files) })
      void saveVaultHandle(handle)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        set({ status: 'loaded', error: null })
        return
      }
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  },

  loadFromFileList: async (fileList: FileList) => {
    set({ status: 'loading', error: null })
    try {
      const files = await readVaultFromFileList(fileList)
      const name = files[0]?.path.split('/')[0] ?? null
      set({ status: 'loaded', source: 'user', vaultName: name, reconnectName: null, ...applyVault(files) })
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  },

  /** Called once on app start: reconnects silently if permission is still granted, otherwise offers a manual reconnect. */
  restoreLastVault: async () => {
    if (!isFileSystemAccessSupported()) return
    const handle = await loadVaultHandle()
    if (!handle) return

    const permission = await handle.queryPermission({ mode: 'read' }).catch(() => 'denied' as const)
    if (permission === 'granted') {
      try {
        const files = await readVaultFromDirectoryHandle(handle)
        set({ status: 'loaded', source: 'user', vaultName: handle.name, reconnectName: null, ...applyVault(files) })
        return
      } catch {
        // fall through to offering a manual reconnect
      }
    }
    set({ reconnectName: handle.name })
  },

  /** Re-grants access to the last used vault folder. Must run from a user gesture (browser requirement). */
  reconnectVault: async () => {
    const handle = await loadVaultHandle()
    if (!handle) {
      set({ reconnectName: null })
      return
    }
    set({ status: 'loading', error: null })
    try {
      const permission = await handle.requestPermission({ mode: 'read' })
      if (permission !== 'granted') {
        set({ status: 'loaded', error: 'Permission to read the vault folder was denied.' })
        return
      }
      const files = await readVaultFromDirectoryHandle(handle)
      set({ status: 'loaded', source: 'user', vaultName: handle.name, reconnectName: null, ...applyVault(files) })
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  },

  forgetVault: async () => {
    await clearVaultHandle()
    set({ reconnectName: null })
    if (get().source !== 'user') return
    get().loadSampleVault()
  },
}))
