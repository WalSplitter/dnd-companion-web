import { create } from 'zustand'
import { reportError } from './errorLogStore'
import { sampleVaultFiles, sampleVaultImages } from '../sample-vault'
import { detectRuleset, type RulesetDetectionResult, type RulesetId } from '../vault/detectRuleset'
import { buildVault } from '../vault/parseFrontmatter'
import { forgetRecentVault, listRecentVaults, rememberRecentVault, updateRecentVault, type RecentVault } from '../vault/handleStore'
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


/** 'none': nothing opened yet — the start page is showing and there is no vault to render. */
export type VaultSource = 'none' | 'sample' | 'user'
type VaultStatus = 'idle' | 'loading' | 'loaded' | 'error'
/** 'unavailable': no file handles to write through (sample vault, or the <input webkitdirectory>
 * fallback for browsers without the File System Access API) — fields stay read-only. */
export type EditPermission = 'unavailable' | 'not-requested' | 'granted' | 'denied'

interface VaultState {
  status: VaultStatus
  source: VaultSource
  vaultName: string | null
  /** The `recents` entry of the open folder (null for the sample vault / the file-list fallback). */
  recentId: string | null
  /** Previously opened vault folders, newest first — the start page's "continue" cards. */
  recents: RecentVault[]
  recentsLoaded: boolean
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
  /** The load actions resolve `true` once the new vault is showing (false: cancelled, failed or superseded). */
  loadFromDirectoryPicker: () => Promise<boolean>
  /** Opens a folder handle obtained some other way (dragged onto the start page). */
  loadFromDirectoryHandle: (handle: FileSystemDirectoryHandle) => Promise<boolean>
  loadFromFileList: (fileList: FileList) => Promise<boolean>
  refreshRecents: () => Promise<void>
  /**
   * Reopens a remembered folder. Asks the browser to re-grant read access, so it must run from a
   * user gesture — unless `silent`, which only succeeds when access is still granted (deep-link boot).
   */
  openRecentVault: (id: string, options?: { silent?: boolean }) => Promise<boolean>
  forgetRecentVault: (id: string) => Promise<void>
  /** Remembers the sheet last looked at in the open folder's recents entry. */
  noteCharacterVisit: (name: string) => void
  /** Drops the open vault and returns to the empty "nothing opened" state. */
  closeVault: () => void
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

const NO_FILES: VaultSourceFile[] = []

/** Nothing opened: the store's initial state, so a returning visitor never sees the sample flash by. */
const EMPTY_STATE = (() => {
  const vault = buildVault(NO_FILES)
  return {
    status: 'idle',
    source: 'none',
    vaultName: null,
    recentId: null,
    loadingProgress: null,
    vault,
    index: buildVaultIndex(vault),
    ruleset: detectRuleset(NO_FILES),
    error: null,
    ...NO_WRITE_ACCESS,
    writeError: null,
  } satisfies Partial<VaultState>
})()

function buildSampleState() {
  const vault = buildVault(sampleVaultFiles, sampleVaultImages)
  return {
    ...EMPTY_STATE,
    status: 'loaded',
    source: 'sample',
    vault,
    index: buildVaultIndex(vault),
    ruleset: detectRuleset(sampleVaultFiles),
  } satisfies Partial<VaultState>
}

/** The bundled demo vault as a complete store state — parsed on first use, reused on every switch back to it. */
let sampleState: ReturnType<typeof buildSampleState> | null = null

/** How many character names a recents entry keeps for its preview medallions. */
const RECENT_PREVIEW_NAMES = 6

/** Bumped by every load; a load whose number is no longer current was superseded and must not apply. */
let loadSeq = 0

export const useVaultStore = create<VaultState>((set, get) => {
  /** Common failure path of the loaders: a cancelled picker is not an error, and a failed load
   * leaves whatever vault was showing before in place. */
  function loadFailed(source: string, err: unknown) {
    const fallback = get().source === 'none' ? 'idle' : 'loaded'
    if (err instanceof DOMException && err.name === 'AbortError') {
      set({ status: fallback, error: null, loadingProgress: null })
      return
    }
    console.error(`[${source}] failed:`, err)
    set({ status: get().source === 'none' ? 'error' : 'loaded', error: errorMessage(err), loadingProgress: null })
    reportError({ titleKey: 'errorLog.loadFailed', hintKey: 'errorLog.hint.loadFailed', source, error: err })
  }

  /** Remembers a freshly opened folder for the start page (best effort — no IndexedDB, no recents). */
  async function remember(handle: FileSystemDirectoryHandle, vault: Vault, ruleset: RulesetId) {
    try {
      const names = vault.characters.map((c) => c.frontmatter.name)
      const id = await rememberRecentVault(handle, { ruleset, characterCount: names.length, characters: names.slice(0, RECENT_PREVIEW_NAMES) })
      if (get().rootHandle === handle) set({ recentId: id })
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
        loadingProgress: null,
        rootHandle: handle,
        fileHandles,
        editPermission: 'not-requested',
        writeError: null,
        ...loaded,
      })
      void remember(handle, loaded.vault, loaded.ruleset.ruleset)
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
    ...EMPTY_STATE,
    recents: [],
    recentsLoaded: false,

    loadSampleVault: () => {
      loadSeq++
      revokeActiveImageAssets()
      sampleState ??= buildSampleState()
      set(sampleState)
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
        set({
          status: 'loaded',
          source: 'user',
          vaultName: files[0]?.path.split('/')[0] ?? null,
          recentId: null,
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

    refreshRecents: async () => {
      set({ recents: isFileSystemAccessSupported() ? await listRecentVaults() : [], recentsLoaded: true })
    },

    openRecentVault: async (id, options) => {
      if (!get().recentsLoaded) await get().refreshRecents()
      const recent = get().recents.find((r) => r.id === id)
      if (!recent) return false
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
      revokeActiveImageAssets()
      set(EMPTY_STATE)
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
