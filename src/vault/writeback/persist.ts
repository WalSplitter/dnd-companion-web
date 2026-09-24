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

/** Reads the file, runs `patch` over its text, and writes the result back through an already-permitted handle. */
async function rewriteFile(fileHandle: FileSystemFileHandle, patch: (content: string) => string): Promise<void> {
  const file = await fileHandle.getFile()
  const patched = patch(await file.text())
  const writable = await fileHandle.createWritable()
  await writable.write(patched)
  await writable.close()
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
