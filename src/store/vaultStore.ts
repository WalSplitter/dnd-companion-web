import { create } from 'zustand'
import { sampleVaultFiles } from '../sample-vault'
import { buildVault } from '../vault/parseFrontmatter'
import { clearVaultHandle, loadVaultHandle, saveVaultHandle } from '../vault/handleStore'
import {
  isFileSystemAccessSupported,
  readVaultFromDirectoryHandle,
  readVaultFromFileList,
  showVaultDirectoryPicker,
  type ImageAssets,
} from '../vault/vaultLoader'
import { buildVaultIndex, type VaultIndex } from '../vault/wikilinks'
import type { Vault, VaultSourceFile } from '../vault/types'

const SAMPLE_VAULT = buildVault(sampleVaultFiles)

export type VaultSource = 'sample' | 'user'
type VaultStatus = 'loading' | 'loaded' | 'error'

interface VaultState {
  status: VaultStatus
  source: VaultSource
  vaultName: string | null
  /** Set when a previously used vault folder was found on disk but needs a user gesture to re-grant read access. */
  reconnectName: string | null
  /** Files read so far / total markdown files found, while `status === 'loading'` from a real folder. */
  loadingProgress: { done: number; total: number } | null
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

// Portrait images are exposed as object URLs (see vaultLoader.ts); each one needs revoking when a
// vault is replaced, or they'd leak for the lifetime of the page across repeated folder reloads.
let activeImageAssets: ImageAssets | null = null

function revokeActiveImageAssets() {
  if (!activeImageAssets) return
  for (const url of activeImageAssets.values()) URL.revokeObjectURL(url)
  activeImageAssets = null
}

function applyVault(files: VaultSourceFile[], imageAssets?: ImageAssets) {
  revokeActiveImageAssets()
  activeImageAssets = imageAssets ?? null
  const vault = buildVault(files, imageAssets)
  return { vault, index: buildVaultIndex(vault) }
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'loaded',
  source: 'sample',
  vaultName: null,
  reconnectName: null,
  loadingProgress: null,
  vault: SAMPLE_VAULT,
  index: buildVaultIndex(SAMPLE_VAULT),
  error: null,

  loadSampleVault: () => {
    revokeActiveImageAssets()
    set({
      status: 'loaded',
      source: 'sample',
      vaultName: null,
      reconnectName: null,
      loadingProgress: null,
      vault: SAMPLE_VAULT,
      index: buildVaultIndex(SAMPLE_VAULT),
      error: null,
    })
    void clearVaultHandle()
  },

  loadFromDirectoryPicker: async () => {
    set({ status: 'loading', error: null, loadingProgress: null })
    try {
      const handle = await showVaultDirectoryPicker()
      const { files, imageAssets } = await readVaultFromDirectoryHandle(handle, (done, total) =>
        set({ loadingProgress: { done, total } }),
      )
      set({
        status: 'loaded',
        source: 'user',
        vaultName: handle.name,
        reconnectName: null,
        loadingProgress: null,
        ...applyVault(files, imageAssets),
      })
      void saveVaultHandle(handle)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[vault] loadFromDirectoryPicker failed:', err)
      if (err instanceof DOMException && err.name === 'AbortError') {
        set({ status: 'loaded', error: null, loadingProgress: null })
        return
      }
      const message = err instanceof DOMException ? `${err.name}: ${err.message}` : err instanceof Error ? err.message : String(err)
      set({ status: 'error', error: message, loadingProgress: null })
    }
  },

  loadFromFileList: async (fileList: FileList) => {
    set({ status: 'loading', error: null, loadingProgress: null })
    try {
      const { files, imageAssets } = await readVaultFromFileList(fileList)
      const name = files[0]?.path.split('/')[0] ?? null
      set({ status: 'loaded', source: 'user', vaultName: name, reconnectName: null, ...applyVault(files, imageAssets) })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[vault] loadFromFileList failed:', err)
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
        set({ status: 'loading', error: null, loadingProgress: null })
        const { files, imageAssets } = await readVaultFromDirectoryHandle(handle, (done, total) =>
          set({ loadingProgress: { done, total } }),
        )
        set({
          status: 'loaded',
          source: 'user',
          vaultName: handle.name,
          reconnectName: null,
          loadingProgress: null,
          ...applyVault(files, imageAssets),
        })
        return
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[vault] restoreLastVault failed:', err)
        set({ status: 'loaded', loadingProgress: null })
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
    set({ status: 'loading', error: null, loadingProgress: null })
    try {
      const permission = await handle.requestPermission({ mode: 'read' })
      if (permission !== 'granted') {
        set({ status: 'loaded', error: 'Permission to read the vault folder was denied.', loadingProgress: null })
        return
      }
      const { files, imageAssets } = await readVaultFromDirectoryHandle(handle, (done, total) =>
        set({ loadingProgress: { done, total } }),
      )
      set({
        status: 'loaded',
        source: 'user',
        vaultName: handle.name,
        reconnectName: null,
        loadingProgress: null,
        ...applyVault(files, imageAssets),
      })
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err), loadingProgress: null })
    }
  },

  forgetVault: async () => {
    await clearVaultHandle()
    set({ reconnectName: null })
    if (get().source !== 'user') return
    get().loadSampleVault()
  },
}))
