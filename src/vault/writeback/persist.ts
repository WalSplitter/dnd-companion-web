import type { Currency, EndeavourContainerSlotAssignment, FieldWriteTarget } from '../types'
import { patchFrontmatterBlock, patchFrontmatterField, YamlPatchError } from './yamlPatch'

export { YamlPatchError }

/** Resolves a field's logical UI value to the raw value written to disk — see `FieldWriteTarget.encode`. */
export function encodeFieldValue(target: FieldWriteTarget, logicalValue: number | boolean): number | boolean {
  if (target.encode === 'invert-from-max' && typeof logicalValue === 'number' && target.max !== undefined) {
    return target.max - logicalValue
  }
  return logicalValue
}

/** Tail of each file's write chain — see `rewriteFile`. */
const pendingWrites = new WeakMap<FileSystemFileHandle, Promise<unknown>>()

/**
 * Reads the file, runs `patch` over its text, and writes the result back through an already-permitted
 * handle. Writes to the same file run one after another: rapid clicks (e.g. a pool's +/− buttons)
 * would otherwise interleave read-patch-write cycles, letting a slower, older write land last.
 */
function rewriteFile(fileHandle: FileSystemFileHandle, patch: (content: string) => string): Promise<void> {
  const run = async () => {
    const file = await fileHandle.getFile()
    const patched = patch(await file.text())
    const writable = await fileHandle.createWritable()
    await writable.write(patched)
    await writable.close()
  }
  const next = (pendingWrites.get(fileHandle) ?? Promise.resolve()).then(run, run)
  pendingWrites.set(fileHandle, next)
  return next
}

/** Patches a single frontmatter field. */
export function writeFieldValue(
  fileHandle: FileSystemFileHandle,
  target: FieldWriteTarget,
  logicalValue: number | boolean,
): Promise<void> {
  return rewriteFile(fileHandle, (content) =>
    patchFrontmatterField(content, target.keyPath, encodeFieldValue(target, logicalValue), { createIfMissing: target.createIfMissing }),
  )
}

/** Rewrites the slot-grid inventory's whole `endeavour_inventory.containers` array (not a single
 * scalar — see `patchFrontmatterBlock`). */
export function writeEndeavourInventory(
  fileHandle: FileSystemFileHandle,
  containers: EndeavourContainerSlotAssignment[],
): Promise<void> {
  return rewriteFile(fileHandle, (content) => patchFrontmatterBlock(content, ['endeavour_inventory', 'containers'], containers))
}

/** Rewrites the character's whole `currency` key (own schema) — as a one-line flow map, matching how
 * the vault's inventory notes hand-write it. */
export function writeCurrencyBlock(fileHandle: FileSystemFileHandle, currency: Currency): Promise<void> {
  return rewriteFile(fileHandle, (content) => patchFrontmatterBlock(content, ['currency'], currency, 1))
}
