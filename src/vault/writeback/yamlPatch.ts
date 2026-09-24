/**
 * A conservative, hand-rolled patcher for a *single* scalar value inside a note's YAML
 * frontmatter — not a general YAML editor. It finds the one line holding a given dotted key path
 * (tracked by indentation, the same convention every file in this vault uses) and replaces only
 * that line's value, leaving every other byte of the file — key order, quote style, comments, the
 * `InputData.Quest` multi-line block, everything after the frontmatter — untouched.
 *
 * Deliberately narrow: only number/boolean values (the only value types this pass needs to write),
 * and it refuses to write (throws `YamlPatchError`) rather than guess whenever the file doesn't look
 * exactly like what it expects. A full YAML re-serialize would risk reformatting the whole file on
 * every auto-saved edit — an unacceptable blast radius against someone's real campaign vault.
 *
 * `patchFrontmatterBlock` (below) relaxes this for exactly one case — the slot-grid inventory's
 * `endeavour_inventory.containers`, an array of objects no scalar patch can express — by replacing
 * that one key's *entire* multi-line value instead of a single line. Still scoped to one key's
 * subtree, not a whole-file re-serialize: everything outside that block (other keys, comments, the
 * markdown body) stays byte-identical.
 */

import { dump } from 'js-yaml'

export class YamlPatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'YamlPatchError'
  }
}

// Captures the opening `---\n` and closing `\n---\r?\n?` delimiters as their own groups so they can
// be spliced back in byte-exact — only the YAML text between them (group 2) is ever rebuilt.
const FRONTMATTER_RE = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/
const KEY_LINE_RE = /^( *)([^\s:#][^:]*):(.*)$/

function formatValue(value: number | boolean): string {
  return typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
}

/** Locates the line holding `keyPath` (tracked by indentation, the same stack-based walk both
 * patchers need), throwing if the file doesn't look exactly like what it expects. */
function findKeyLine(lines: string[], keyPath: string[]): number {
  const line = findKeyLineOrNull(lines, keyPath)
  if (line === null) throw new YamlPatchError(`key path not found: ${keyPath.join('.')}`)
  return line
}

/** Like `findKeyLine`, but returns `null` for a key path that simply isn't there. */
function findKeyLineOrNull(lines: string[], keyPath: string[]): number | null {
  const stack: { indent: number; key: string }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '' || line.trim().startsWith('#')) continue
    if (line.startsWith('\t')) throw new YamlPatchError('tab-indented YAML is not supported')

    const keyMatch = KEY_LINE_RE.exec(line)
    if (!keyMatch) continue // a list item, a continuation line, etc. — not a key line, skip

    const indent = keyMatch[1].length
    const key = keyMatch[2].trim()
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
    stack.push({ indent, key })

    const path = stack.map((s) => s.key)
    if (path.length === keyPath.length && path.every((k, idx) => k === keyPath[idx])) return i
  }

  return null
}

/**
 * Adds `leaf: value` as the last child of the leaf's parent mapping — only for optional fields whose
 * key may simply be absent (e.g. `hp.temp`). The parent itself must already exist as a block mapping
 * (`hp:` with nothing after the colon); a flow map (`hp: { current: 3 }`) or a missing parent still
 * throws rather than guessing.
 */
function insertMissingLeaf(lines: string[], keyPath: string[], formatted: string): void {
  const leaf = keyPath[keyPath.length - 1]

  if (keyPath.length === 1) {
    let end = lines.length
    while (end > 0 && lines[end - 1].trim() === '') end--
    lines.splice(end, 0, `${leaf}: ${formatted}`)
    return
  }

  const parentLine = findKeyLine(lines, keyPath.slice(0, -1))
  const parentMatch = KEY_LINE_RE.exec(lines[parentLine])!
  const parentValue = parentMatch[3].trim()
  if (parentValue !== '' && !parentValue.startsWith('#')) {
    throw new YamlPatchError(`cannot add ${keyPath.join('.')}: parent is not a block mapping`)
  }
  const parentIndent = parentMatch[1].length

  let childIndent: number | null = null
  let lastChild = parentLine
  for (let i = parentLine + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '' || line.trim().startsWith('#')) continue
    const indent = /^( *)/.exec(line)![1].length
    if (indent <= parentIndent) break
    childIndent ??= indent
    lastChild = i
  }

  lines.splice(lastChild + 1, 0, `${' '.repeat(childIndent ?? parentIndent + 2)}${leaf}: ${formatted}`)
}

export function patchFrontmatterField(
  content: string,
  keyPath: string[],
  value: number | boolean,
  options: { createIfMissing?: boolean } = {},
): string {
  if (keyPath.length === 0) throw new YamlPatchError('empty key path')

  const match = FRONTMATTER_RE.exec(content)
  if (!match) throw new YamlPatchError('no frontmatter block found')
  const [, openDelim, yamlText, closeDelim, rest] = match

  const newline = yamlText.includes('\r\n') ? '\r\n' : '\n'
  const lines = yamlText.split(/\r?\n/)
  const targetLine = findKeyLineOrNull(lines, keyPath)

  if (targetLine === null) {
    if (!options.createIfMissing) throw new YamlPatchError(`key path not found: ${keyPath.join('.')}`)
    insertMissingLeaf(lines, keyPath, formatValue(value))
  } else {
    const keyMatch = KEY_LINE_RE.exec(lines[targetLine])!
    lines[targetLine] = `${keyMatch[1]}${keyMatch[2]}: ${formatValue(value)}`
  }

  return openDelim + lines.join(newline) + closeDelim + rest
}

/**
 * Replaces a key's entire value — which may span many lines (a nested array/object), not just one
 * scalar — with a freshly-dumped YAML rendering of `value`. Used for the one field a line-level
 * patch can't express: the slot-grid inventory's `endeavour_inventory.containers`.
 *
 * The block being replaced is found the same indentation-based way `patchFrontmatterField` finds its
 * target line, then extended forward through every subsequent line indented *deeper* than the key
 * itself (its nested list items, their own nested keys, ...) — the first line back at or above the
 * key's own indent ends it. Re-dumping necessarily picks its own quote/list style for just this
 * subtree (`js-yaml`'s defaults, not necessarily matching the rest of the file's hand-authored
 * style) — everything outside the block is untouched.
 */
export function patchFrontmatterBlock(content: string, keyPath: string[], value: unknown, flowLevel = -1): string {
  if (keyPath.length === 0) throw new YamlPatchError('empty key path')

  const match = FRONTMATTER_RE.exec(content)
  if (!match) throw new YamlPatchError('no frontmatter block found')
  const [, openDelim, yamlText, closeDelim, rest] = match

  const newline = yamlText.includes('\r\n') ? '\r\n' : '\n'
  const lines = yamlText.split(/\r?\n/)
  const targetLine = findKeyLine(lines, keyPath)

  const keyMatch = KEY_LINE_RE.exec(lines[targetLine])!
  const keyIndent = keyMatch[1].length

  let blockEnd = lines.length
  for (let i = targetLine + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '' || line.trim().startsWith('#')) continue
    const indent = /^( *)/.exec(line)![1].length
    if (indent <= keyIndent) {
      blockEnd = i
      break
    }
  }

  const lastKey = keyPath[keyPath.length - 1]
  const dumped = dump({ [lastKey]: value }, { indent: 2, lineWidth: -1, flowLevel }).replace(/\r?\n$/, '')
  const indentPrefix = ' '.repeat(keyIndent)
  const replacement = dumped
    .split('\n')
    .map((line) => (line ? indentPrefix + line : line))
    .join(newline)

  lines.splice(targetLine, blockEnd - targetLine, replacement)

  return openDelim + lines.join(newline) + closeDelim + rest
}
