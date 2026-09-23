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

/** Reads, patches, and writes back a single frontmatter field through an already-permitted file handle. */
export async function writeFieldValue(
  fileHandle: FileSystemFileHandle,
  target: FieldWriteTarget,
  logicalValue: number | boolean,
): Promise<void> {
  const file = await fileHandle.getFile()
  const content = await file.text()
  const patched = patchFrontmatterField(content, target.keyPath, encodeFieldValue(target, logicalValue))
  const writable = await fileHandle.createWritable()
  await writable.write(patched)
  await writable.close()
}

/** Reads, patches, and writes back the slot-grid inventory's whole `endeavour_inventory.containers`
 * array (not a single scalar — see `patchFrontmatterBlock`) through an already-permitted file handle. */
export async function writeEndeavourInventory(
  fileHandle: FileSystemFileHandle,
  containers: EndeavourContainerSlotAssignment[],
): Promise<void> {
  const file = await fileHandle.getFile()
  const content = await file.text()
  const patched = patchFrontmatterBlock(content, ['endeavour_inventory', 'containers'], containers)
  const writable = await fileHandle.createWritable()
  await writable.write(patched)
  await writable.close()
}

/** Rewrites the character's whole `currency` key (own schema) — as a one-line flow map, matching how
 * the vault's inventory notes hand-write it. */
export async function writeCurrencyBlock(fileHandle: FileSystemFileHandle, currency: Currency): Promise<void> {
  const file = await fileHandle.getFile()
  const content = await file.text()
  const patched = patchFrontmatterBlock(content, ['currency'], currency, 1)
  const writable = await fileHandle.createWritable()
  await writable.write(patched)
  await writable.close()
}
