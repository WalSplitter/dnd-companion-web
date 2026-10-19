import { load } from 'js-yaml'
import { serializeJournal } from '../adapters/journal'
import { WORN_SLOTS, type CharacterFrontmatter, type Currency, type EndeavourContainerSlotAssignment, type EquipmentChange, type FieldWriteTarget, type InventoryEntry, type JournalEntry } from '../types'
import { patchFrontmatterBlock, patchFrontmatterField, YamlPatchError } from './yamlPatch'

export { YamlPatchError }

/**
 * One edit to a note's frontmatter, as plain data rather than a closure — so it can be queued,
 * persisted across a reload and re-applied onto a newer version of the file (see `github/githubSync.ts`).
 * `field` patches a single scalar line (`patchFrontmatterField`), `block` replaces one key's whole
 * value (`patchFrontmatterBlock`). `create` brings a new note into being with `value` as its text
 * (see `VaultWriter.create`); it leaves a note that already has text alone.
 */
export type FrontmatterPatch =
  | { kind: 'field'; keyPath: string[]; value: number | boolean; createIfMissing?: boolean }
  | { kind: 'block'; keyPath: string[]; value: unknown; flowLevel?: number; createIfMissing?: boolean }
  | { kind: 'create'; keyPath: []; value: string }

export function applyPatch(content: string, patch: FrontmatterPatch): string {
  if (patch.kind === 'create') return content.trim() === '' ? patch.value : content
  return patch.kind === 'field'
    ? patchFrontmatterField(content, patch.keyPath, patch.value, { createIfMissing: patch.createIfMissing })
    : patchFrontmatterBlock(content, patch.keyPath, patch.value, patch.flowLevel, patch.createIfMissing)
}

/** Creates the note `content` describes (see `VaultWriter.create`). */
export function createPatch(content: string): FrontmatterPatch {
  return { kind: 'create', keyPath: [], value: content }
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

/** The value at `keyPath` in a note's frontmatter as YAML reads it (`undefined`: absent or unreadable). */
export function readFrontmatterValue(content: string, keyPath: string[]): unknown {
  const match = FRONTMATTER_RE.exec(content)
  if (!match) return undefined
  let node: unknown
  try {
    node = load(match[1])
  } catch {
    return undefined
  }
  for (const key of keyPath) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[key]
  }
  return node
}

/** Resolves a field's logical UI value to the raw value written to disk — see `FieldWriteTarget.encode`. */
export function encodeFieldValue(target: FieldWriteTarget, logicalValue: number | boolean): number | boolean {
  if (target.encode === 'invert-from-max' && typeof logicalValue === 'number' && target.max !== undefined) {
    return target.max - logicalValue
  }
  return logicalValue
}

/** Patches a single frontmatter field. */
export function fieldPatch(target: FieldWriteTarget, logicalValue: number | boolean): FrontmatterPatch {
  return { kind: 'field', keyPath: target.keyPath, value: encodeFieldValue(target, logicalValue), createIfMissing: target.createIfMissing }
}

/**
 * Rewrites the list inventory's whole `inventory` block (own schema: `equipped`/`carried` wikilink
 * lists, possibly with inline `{ name, quantity, weight_lb }` items). Keeps any other keys the block
 * carries, leaves out an empty list, and removes the block once both lists are empty.
 */
export function inventoryPatch(inventory: NonNullable<CharacterFrontmatter['inventory']>): FrontmatterPatch {
  const clean = (list: InventoryEntry[] | undefined) =>
    (list ?? []).map((entry) => {
      if (typeof entry === 'string') return entry
      const { _write: _unused, ...item } = entry
      return item
    })
  const { equipped, carried, ...rest } = inventory
  const value: Record<string, unknown> = { ...rest }
  if (equipped && equipped.length > 0) value.equipped = clean(equipped)
  if (carried && carried.length > 0) value.carried = clean(carried)
  return { kind: 'block', keyPath: ['inventory'], value: Object.keys(value).length > 0 ? value : undefined, createIfMissing: true }
}

/** Rewrites the slot-grid inventory's whole `endeavour_inventory.containers` array (not a single
 * scalar — see `patchFrontmatterBlock`). */
export function endeavourInventoryPatch(containers: EndeavourContainerSlotAssignment[]): FrontmatterPatch {
  return { kind: 'block', keyPath: ['endeavour_inventory', 'containers'], value: containers }
}

/**
 * What the character wears and wields, on its own file: `armor:`, `shield:`, `head:`, `cloak:`, `gloves:`, `belt:`, `boots:` and
 * `necklace:` (one wikilink each; `null` = taken off, which deletes the key) and the whole `rings:`
 * and `attacks:` lists (an empty list deletes the key).
 * Fields left `undefined` are unchanged and get no patch.
 */
export function equipmentPatches(change: Omit<EquipmentChange, 'containers' | 'first'>): FrontmatterPatch[] {
  const patches: FrontmatterPatch[] = []
  const add = (key: string, value: unknown) => patches.push({ kind: 'block', keyPath: [key], value, createIfMissing: true })
  for (const slot of WORN_SLOTS) if (change[slot] !== undefined) add(slot, change[slot] ?? undefined)
  if (change.rings !== undefined) add('rings', change.rings.length > 0 ? change.rings : undefined)
  if (change.attack_entries !== undefined) add('attacks', change.attack_entries.length > 0 ? change.attack_entries : undefined)
  return patches
}

/** Rewrites the character's `conditions.active` list as one line (`active: [Liegend, Blind]`); an empty
 * list removes the key. */
export function conditionsPatch(active: string[]): FrontmatterPatch {
  return { kind: 'block', keyPath: ['conditions', 'active'], value: active.length > 0 ? active : undefined, flowLevel: 1, createIfMissing: true }
}

/** Rewrites the character's whole `journal` list (see `adapters/journal.ts`); an empty journal removes the key. */
export function journalPatch(entries: JournalEntry[]): FrontmatterPatch {
  return { kind: 'block', keyPath: ['journal'], value: entries.length > 0 ? serializeJournal(entries) : undefined, createIfMissing: true }
}

/** Rewrites the DM list (`dm:`) of the campaign journal (see `adapters/campaignJournal.ts`). */
export function campaignDmPatch(dms: string[]): FrontmatterPatch {
  return { kind: 'block', keyPath: ['dm'], value: dms.length > 0 ? dms : undefined, createIfMissing: true }
}

/** Rewrites the character's whole `currency` key (own schema) — as a one-line flow map, matching how
 * the vault's inventory notes hand-write it. */
export function currencyBlockPatch(currency: Currency): FrontmatterPatch {
  return { kind: 'block', keyPath: ['currency'], value: currency, flowLevel: 1 }
}

/** Tail of each file's write chain — see `rewriteFile`. */
const pendingWrites = new WeakMap<FileSystemFileHandle, Promise<unknown>>()

/**
 * Reads the file, applies `patch` to its text, and writes the result back through an already-permitted
 * handle. Writes to the same file run one after another: rapid clicks (e.g. a pool's +/− buttons)
 * would otherwise interleave read-patch-write cycles, letting a slower, older write land last.
 */
export function rewriteFile(fileHandle: FileSystemFileHandle, patch: FrontmatterPatch): Promise<void> {
  const run = async () => {
    const file = await fileHandle.getFile()
    const patched = applyPatch(await file.text(), patch)
    const writable = await fileHandle.createWritable()
    await writable.write(patched)
    await writable.close()
  }
  const next = (pendingWrites.get(fileHandle) ?? Promise.resolve()).then(run, run)
  pendingWrites.set(fileHandle, next)
  return next
}

export function writeFieldValue(fileHandle: FileSystemFileHandle, target: FieldWriteTarget, logicalValue: number | boolean): Promise<void> {
  return rewriteFile(fileHandle, fieldPatch(target, logicalValue))
}

export function writeEndeavourInventory(fileHandle: FileSystemFileHandle, containers: EndeavourContainerSlotAssignment[]): Promise<void> {
  return rewriteFile(fileHandle, endeavourInventoryPatch(containers))
}

export function writeCurrencyBlock(fileHandle: FileSystemFileHandle, currency: Currency): Promise<void> {
  return rewriteFile(fileHandle, currencyBlockPatch(currency))
}

/**
 * Where a vault's edits go: straight into a local folder's files, or queued as commits to a GitHub
 * repository. The store talks only to this, so its optimistic-edit/rollback logic is the same for both.
 * `write` rejects when the patch can't be applied — the store then rolls the edit back.
 */
export interface VaultWriter {
  /** Whether `path` is a note this writer knows and can patch. */
  canWrite(path: string): boolean
  write(path: string, patch: FrontmatterPatch, context?: WriteContext): Promise<void>
  /** Brings a new note at `path` into being with `content` as its text, after which `canWrite(path)`
   * holds. A note that already exists there is kept as it is. */
  create(path: string, content: string, context?: WriteContext): Promise<void>
}

/** What an edit is about, beyond the file and key — used to describe it (e.g. in a commit message). */
export interface WriteContext {
  /** Name of the character the edit belongs to (the note may be a linked sheet with another name). */
  character?: string
  /** Others are waiting for it (the DM's campaign journal): a queued writer commits it after a short pause, not the usual long one. */
  soon?: boolean
}

/** Accepts every edit and stores none — for the bundled sample vault, whose edits live only in memory. */
export const sandboxWriter: VaultWriter = {
  canWrite: () => true,
  write: () => Promise.resolve(),
  create: () => Promise.resolve(),
}

/** The file at `path` (vault-relative, `/`-separated) under `root`, creating it — and missing folders —
 * with `content` when it doesn't exist yet. An existing file is returned untouched. */
async function createFile(root: FileSystemDirectoryHandle, path: string, content: string): Promise<FileSystemFileHandle> {
  const segments = path.split('/')
  const fileName = segments.pop()!
  let dir = root
  for (const segment of segments) dir = await dir.getDirectoryHandle(segment, { create: true })
  try {
    return await dir.getFileHandle(fileName)
  } catch (err) {
    if (!(err instanceof DOMException && err.name === 'NotFoundError')) throw err
  }
  const handle = await dir.getFileHandle(fileName, { create: true })
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
  return handle
}

/**
 * Writes through the File System Access handles collected while reading a local vault folder. New
 * notes are created under `root`; a write to one still being created waits for it.
 */
export function folderWriter(fileHandles: Map<string, FileSystemFileHandle>, root?: FileSystemDirectoryHandle): VaultWriter {
  const creating = new Map<string, Promise<FileSystemFileHandle>>()
  return {
    canWrite: (path) => fileHandles.has(path) || creating.has(path),
    write: async (path, patch) => {
      const handle = fileHandles.get(path) ?? (await creating.get(path))
      if (!handle) throw new Error(`no file handle for ${path}`)
      return rewriteFile(handle, patch)
    },
    create: async (path, content) => {
      if (fileHandles.has(path)) return
      if (!root) throw new Error(`cannot create ${path}: no vault folder`)
      const pending = creating.get(path) ?? createFile(root, path, content)
      creating.set(path, pending)
      try {
        fileHandles.set(path, await pending)
      } finally {
        creating.delete(path)
      }
    },
  }
}
