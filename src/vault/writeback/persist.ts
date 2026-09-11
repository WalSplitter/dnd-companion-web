import type { FieldWriteTarget } from '../types'
import { patchFrontmatterField, YamlPatchError } from './yamlPatch'

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
