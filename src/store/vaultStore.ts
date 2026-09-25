import { create } from 'zustand'
import { reportError } from './errorLogStore'
import { sampleVaultFiles, sampleVaultImages } from '../sample-vault'
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
import { writeCurrencyBlock, writeEndeavourInventory, writeFieldValue } from '../vault/writeback/persist'
import type { CharacterFrontmatter, Currency, EndeavourContainerSlotAssignment, FieldWriteTarget, Vault, VaultSourceFile } from '../vault/types'


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
  /**
   * Replaces a character's coin purse. Same optimistic-write + rollback shape as the other writers;
   * disk write goes to the whole `currency` block (own schema, `_write.currency_block`) or, for the
   * legacy vault, to each changed `Geld.*` scalar (`_write.currency`). No-op without edit permission.
   */
  setCurrency: (characterPath: string, currency: Currency) => Promise<void>
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

function errorMessage(err: unknown): string {
  if (err instanceof DOMException) return `${err.name}: ${err.message}`
  return err instanceof Error ? err.message : String(err)
}

/** Returns `vault` with `mutate` applied to one character's frontmatter. */
function mapCharacter(vault: Vault, characterPath: string, mutate: (character: CharacterFrontmatter) => CharacterFrontmatter): Vault {
  return { ...vault, characters: vault.characters.map((c) => (c.path === characterPath ? { ...c, frontmatter: mutate(c.frontmatter) } : c)) }
}

/** State shared by every "a vault is showing" transition that has no folder handles to write through. */
const NO_WRITE_ACCESS = { rootHandle: null, fileHandles: null, editPermission: 'unavailable' } as const

/** The bundled demo vault as a complete store state — parsed once, reused on every switch back to it. */
const SAMPLE_STATE = (() => {
  const vault = buildVault(sampleVaultFiles, sampleVaultImages)
  return {
    status: 'loaded',
    source: 'sample',
    vaultName: null,
    reconnectName: null,
    loadingProgress: null,
    vault,
    index: buildVaultIndex(vault),
    ruleset: detectRuleset(sampleVaultFiles),
    error: null,
    ...NO_WRITE_ACCESS,
    writeError: null,
  } satisfies Partial<VaultState>
})()

export const useVaultStore = create<VaultState>((set, get) => {
  /** Reads a vault folder (reporting progress) and makes it the active vault, ready for a later edit-permission request. */
  async function loadFromHandle(handle: FileSystemDirectoryHandle) {
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
    const previous = get().vault.characters.find((c) => c.path === characterPath)?.frontmatter
    set({ vault: mapCharacter(get().vault, characterPath, mutate), writeError: null })
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
    }
  }

  return {
    ...SAMPLE_STATE,

    loadSampleVault: () => {
      revokeActiveImageAssets()
      set(SAMPLE_STATE)
      void clearVaultHandle()
    },

    loadFromDirectoryPicker: async () => {
      set({ status: 'loading', error: null, loadingProgress: null })
      try {
        const handle = await showVaultDirectoryPicker()
        await loadFromHandle(handle)
        void saveVaultHandle(handle)
      } catch (err) {
        console.error('[vault] loadFromDirectoryPicker failed:', err)
        if (err instanceof DOMException && err.name === 'AbortError') {
          set({ status: 'loaded', error: null, loadingProgress: null })
          return
        }
        set({ status: 'error', error: errorMessage(err), loadingProgress: null })
        reportError({ titleKey: 'errorLog.loadFailed', hintKey: 'errorLog.hint.loadFailed', source: 'vault.loadFromDirectoryPicker', error: err })
      }
    },

    loadFromFileList: async (fileList: FileList) => {
      set({ status: 'loading', error: null, loadingProgress: null })
      try {
        const { files, imageAssets } = await readVaultFromFileList(fileList)
        set({
          status: 'loaded',
          source: 'user',
          vaultName: files[0]?.path.split('/')[0] ?? null,
          reconnectName: null,
          ...NO_WRITE_ACCESS,
          writeError: null,
          ...applyVault(files, imageAssets),
        })
      } catch (err) {
        console.error('[vault] loadFromFileList failed:', err)
        reportError({ titleKey: 'errorLog.loadFailed', hintKey: 'errorLog.hint.loadFailed', source: 'vault.loadFromFileList', error: err })
        set({ status: 'error', error: errorMessage(err) })
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
          await loadFromHandle(handle)
          return
        } catch (err) {
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
          const message = 'Permission to read the vault folder was denied.'
          set({ status: 'loaded', error: message, loadingProgress: null })
          reportError({ titleKey: 'errorLog.loadFailed', hintKey: 'errorLog.hint.loadFailed', source: 'vault.reconnectVault', error: message })
          return
        }
        await loadFromHandle(handle)
      } catch (err) {
        reportError({ titleKey: 'errorLog.loadFailed', hintKey: 'errorLog.hint.loadFailed', source: 'vault.reconnectVault', error: err })
        set({ status: 'error', error: errorMessage(err), loadingProgress: null })
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
        console.error('[vault] requestEditPermission failed:', err)
        set({ editPermission: 'denied' })
      }
    },

    updateCharacterField: async (characterPath, target, logicalValue, mutate) => {
      if (!target) return
      const { fileHandles, editPermission } = get()
      if (editPermission !== 'granted' || !fileHandles) return
      const fileHandle = fileHandles.get(target.path)
      if (!fileHandle) return

      await editCharacter(characterPath, mutate, () => writeFieldValue(fileHandle, target, logicalValue), {
        source: 'vault.updateCharacterField',
        context: { characterPath, target, value: logicalValue },
        retry: () => void get().updateCharacterField(characterPath, target, logicalValue, mutate),
      })
    },

    setEndeavourInventory: async (characterPath, containers) => {
      const { vault, fileHandles, editPermission } = get()
      const target = vault.characters.find((c) => c.path === characterPath)?.frontmatter._write?.endeavour_inventory
      const fileHandle = editPermission === 'granted' && target ? fileHandles?.get(target.path) : undefined

      await editCharacter(
        characterPath,
        (c) => ({ ...c, endeavour_inventory: { containers } }),
        // Local-only (no write) when editing isn't permitted or the field has no file to go to.
        fileHandle ? () => writeEndeavourInventory(fileHandle, containers) : null,
        {
          source: 'vault.setEndeavourInventory',
          context: { characterPath, writePath: target?.path, containers },
          retry: () => void get().setEndeavourInventory(characterPath, containers),
        },
      )
    },

    setCurrency: async (characterPath, currency) => {
      const { vault, fileHandles, editPermission } = get()
      if (editPermission !== 'granted' || !fileHandles) return
      const character = vault.characters.find((c) => c.path === characterPath)?.frontmatter
      const targets = character?._write
      if (!character || !targets) return
      const previous = character.currency ?? {}

      async function write() {
        if (targets?.currency_block) {
          const handle = fileHandles?.get(targets.currency_block.path)
          if (!handle) throw new Error(`no file handle for ${targets.currency_block.path}`)
          await writeCurrencyBlock(handle, currency)
        } else if (targets?.currency) {
          for (const [coin, target] of Object.entries(targets.currency) as [keyof Currency, FieldWriteTarget][]) {
            if ((currency[coin] ?? 0) === (previous[coin] ?? 0)) continue
            const handle = fileHandles?.get(target.path)
            if (!handle) throw new Error(`no file handle for ${target.path}`)
            await writeFieldValue(handle, target, currency[coin] ?? 0)
          }
        }
      }

      await editCharacter(characterPath, (c) => ({ ...c, currency }), write, {
        source: 'vault.setCurrency',
        context: { characterPath, previous, next: currency, writeTargets: { currency_block: targets.currency_block, currency: targets.currency } },
        retry: () => void get().setCurrency(characterPath, currency),
      })
    },
  }
})

/** Whether vault edits are currently written back to disk (the user granted `readwrite` access). */
export function useCanEdit(): boolean {
  return useVaultStore((s) => s.editPermission === 'granted')
}
