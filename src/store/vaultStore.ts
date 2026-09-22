import { create } from 'zustand'
import { sampleVaultFiles } from '../sample-vault'
import { detectRuleset, type RulesetDetectionResult } from '../vault/detectRuleset'
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
import { writeEndeavourInventory, writeFieldValue } from '../vault/writeback/persist'
import type { CharacterFrontmatter, EndeavourContainerSlotAssignment, FieldWriteTarget, Vault, VaultSourceFile } from '../vault/types'

const SAMPLE_VAULT = buildVault(sampleVaultFiles)
const SAMPLE_RULESET = detectRuleset(sampleVaultFiles)

export type VaultSource = 'sample' | 'user'
type VaultStatus = 'loading' | 'loaded' | 'error'
/** 'unavailable': no file handles to write through (sample vault, or the <input webkitdirectory>
 * fallback for browsers without the File System Access API) — fields stay read-only. */
export type EditPermission = 'unavailable' | 'not-requested' | 'granted' | 'denied'

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
  /** Best-effort guess at which ruleset the loaded vault's content follows — see `detectRuleset.ts`. */
  ruleset: RulesetDetectionResult
  error: string | null
  rootHandle: FileSystemDirectoryHandle | null
  fileHandles: Map<string, FileSystemFileHandle> | null
  editPermission: EditPermission
  /** Set when a field write failed after already being applied optimistically (and then rolled back). */
  writeError: string | null
  loadSampleVault: () => void
  loadFromDirectoryPicker: () => Promise<void>
  loadFromFileList: (fileList: FileList) => Promise<void>
  restoreLastVault: () => Promise<void>
  reconnectVault: () => Promise<void>
  forgetVault: () => Promise<void>
  /** Requests `readwrite` permission on the vault folder — must be called from a direct user gesture. */
  requestEditPermission: () => Promise<void>
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
  return { vault, index: buildVaultIndex(vault), ruleset: detectRuleset(files) }
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'loaded',
  source: 'sample',
  vaultName: null,
  reconnectName: null,
  loadingProgress: null,
  vault: SAMPLE_VAULT,
  index: buildVaultIndex(SAMPLE_VAULT),
  ruleset: SAMPLE_RULESET,
  error: null,
  rootHandle: null,
  fileHandles: null,
  editPermission: 'unavailable',
  writeError: null,

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
      ruleset: SAMPLE_RULESET,
      error: null,
      rootHandle: null,
      fileHandles: null,
      editPermission: 'unavailable',
      writeError: null,
    })
    void clearVaultHandle()
  },

  loadFromDirectoryPicker: async () => {
    set({ status: 'loading', error: null, loadingProgress: null })
    try {
      const handle = await showVaultDirectoryPicker()
      const { files, imageAssets, fileHandles } = await readVaultFromDirectoryHandle(handle, (done, total) =>
        set({ loadingProgress: { done, total } }),
      )
      set({
        status: 'loaded',
        source: 'user',
        vaultName: handle.name,
        reconnectName: null,
        loadingProgress: null,
        rootHandle: handle,
        fileHandles,
        editPermission: 'not-requested',
        writeError: null,
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
      set({
        status: 'loaded',
        source: 'user',
        vaultName: name,
        reconnectName: null,
        rootHandle: null,
        fileHandles: null,
        editPermission: 'unavailable',
        writeError: null,
        ...applyVault(files, imageAssets),
      })
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
        const { files, imageAssets, fileHandles } = await readVaultFromDirectoryHandle(handle, (done, total) =>
          set({ loadingProgress: { done, total } }),
        )
        set({
          status: 'loaded',
          source: 'user',
          vaultName: handle.name,
          reconnectName: null,
          loadingProgress: null,
          rootHandle: handle,
          fileHandles,
          editPermission: 'not-requested',
          writeError: null,
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
      const { files, imageAssets, fileHandles } = await readVaultFromDirectoryHandle(handle, (done, total) =>
        set({ loadingProgress: { done, total } }),
      )
      set({
        status: 'loaded',
        source: 'user',
        vaultName: handle.name,
        reconnectName: null,
        loadingProgress: null,
        rootHandle: handle,
        fileHandles,
        editPermission: 'not-requested',
        writeError: null,
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

  requestEditPermission: async () => {
    const { rootHandle } = get()
    if (!rootHandle) return
    try {
      const result = await rootHandle.requestPermission({ mode: 'readwrite' })
      set({ editPermission: result === 'granted' ? 'granted' : 'denied' })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[vault] requestEditPermission failed:', err)
      set({ editPermission: 'denied' })
    }
  },

  updateCharacterField: async (characterPath, target, logicalValue, mutate) => {
    if (!target) return
    const { fileHandles, editPermission, vault } = get()
    if (editPermission !== 'granted' || !fileHandles) return
    const fileHandle = fileHandles.get(target.path)
    if (!fileHandle) return

    const previousVault = vault
    set({
      vault: { ...vault, characters: vault.characters.map((c) => (c.path === characterPath ? { ...c, frontmatter: mutate(c.frontmatter) } : c)) },
      writeError: null,
    })

    try {
      await writeFieldValue(fileHandle, target, logicalValue)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[vault] updateCharacterField failed, rolling back:', err)
      set({ vault: previousVault, writeError: err instanceof Error ? err.message : String(err) })
    }
  },

  setEndeavourInventory: async (characterPath, containers) => {
    const { vault, fileHandles, editPermission } = get()
    const previousVault = vault
    const target = vault.characters.find((c) => c.path === characterPath)?.frontmatter._write?.endeavour_inventory

    set({
      vault: {
        ...vault,
        characters: vault.characters.map((c) =>
          c.path === characterPath ? { ...c, frontmatter: { ...c.frontmatter, endeavour_inventory: { containers } } } : c,
        ),
      },
      writeError: null,
    })

    if (editPermission !== 'granted' || !fileHandles || !target) return
    const fileHandle = fileHandles.get(target.path)
    if (!fileHandle) return

    try {
      await writeEndeavourInventory(fileHandle, containers)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[vault] setEndeavourInventory failed, rolling back:', err)
      set({ vault: previousVault, writeError: err instanceof Error ? err.message : String(err) })
    }
  },
}))
