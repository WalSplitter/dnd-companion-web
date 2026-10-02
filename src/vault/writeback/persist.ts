import { load } from 'js-yaml'
import { WORN_SLOTS, type CharacterFrontmatter, type Currency, type EndeavourContainerSlotAssignment, type EquipmentChange, type FieldWriteTarget, type InventoryEntry } from '../types'
import { patchFrontmatterBlock, patchFrontmatterField, YamlPatchError } from './yamlPatch'

export { YamlPatchError }

/**
 * One edit to a note's frontmatter, as plain data rather than a closure — so it can be queued,
 * persisted across a reload and re-applied onto a newer version of the file (see `github/githubSync.ts`).
 * `field` patches a single scalar line (`patchFrontmatterField`), `block` replaces one key's whole
 * value (`patchFrontmatterBlock`).
 */
export type FrontmatterPatch =
  | { kind: 'field'; keyPath: string[]; value: number | boolean; createIfMissing?: boolean }
  | { kind: 'block'; keyPath: string[]; value: unknown; flowLevel?: number; createIfMissing?: boolean }

export function applyPatch(content: string, patch: FrontmatterPatch): string {
  return patch.kind === 'field'
    ? patchFrontmatterField(content, patch.keyPath, patch.value, { createIfMissing: patch.createIfMissing })
    : patchFrontmatterBlock(content, patch.keyPath, patch.value, patch.flowLevel, patch.createIfMissing)
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
}

/** What an edit is about, beyond the file and key — used to describe it (e.g. in a commit message). */
export interface WriteContext {
  /** Name of the character the edit belongs to (the note may be a linked sheet with another name). */
  character?: string
}

/** Accepts every edit and stores none — for the bundled sample vault, whose edits live only in memory. */
export const sandboxWriter: VaultWriter = {
  canWrite: () => true,
  write: () => Promise.resolve(),
}

/** Writes through the File System Access handles collected while reading a local vault folder. */
export function folderWriter(fileHandles: Map<string, FileSystemFileHandle>): VaultWriter {
  return {
    canWrite: (path) => fileHandles.has(path),
    write: (path, patch) => {
      const handle = fileHandles.get(path)
      return handle ? rewriteFile(handle, patch) : Promise.reject(new Error(`no file handle for ${path}`))
    },
  }
}
