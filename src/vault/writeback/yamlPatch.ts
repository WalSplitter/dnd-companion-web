/**
 * A conservative, hand-rolled patcher for a *single* scalar value inside a note's YAML
 * frontmatter — not a general YAML editor. It finds the one line holding a given dotted key path
 * (tracked by indentation, the same convention every file in this vault uses) and replaces only
 * that line's value, leaving every other byte of the file — key order, quote style, comments, the
 * `InputData.Quest` multi-line block, everything after the frontmatter — untouched.
 *
 * Deliberately narrow: only number/boolean values (the only value types this pass needs to write),
 * and it refuses to write (throws `YamlPatchError`) rather than guess whenever the file doesn't look
 * exactly like what it expects. Keys match the way YAML reads them (`"1"` and `1` are one key), and a
 * leaf inside a one-line flow map (`"1": { max: 2, used: 0 }`) is rewritten on that same line. A full YAML re-serialize would risk reformatting the whole file on
 * every auto-saved edit — an unacceptable blast radius against someone's real campaign vault.
 *
 * `patchFrontmatterBlock` (below) relaxes this for exactly one case — the slot-grid inventory's
 * `endeavour_inventory.containers`, an array of objects no scalar patch can express — by replacing
 * that one key's *entire* multi-line value instead of a single line. Still scoped to one key's
 * subtree, not a whole-file re-serialize: everything outside that block (other keys, comments, the
 * markdown body) stays byte-identical.
 */

import { dump, load } from 'js-yaml'

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

/** A key as YAML reads it: `"1"`, `'1'` and `1` all name the same key. Without this, a quoted key on
 * disk never matched its bare key path, and `createIfMissing` added a duplicate sibling that broke the
 * whole file's YAML. */
function normalizeKey(raw: string): string {
  const key = raw.trim()
  if (key.length >= 2 && key.startsWith('"') && key.endsWith('"')) return key.slice(1, -1).replace(/\\(["\\])/g, '$1')
  if (key.length >= 2 && key.startsWith("'") && key.endsWith("'")) return key.slice(1, -1).replace(/''/g, "'")
  return key
}

/** Matches a key line's value that is a whole one-line flow map (`{ max: 2, used: 0 }`), optionally
 * followed by a comment — the only flow shape `patchFlowMapLine` rewrites. */
const FLOW_MAP_VALUE_RE = /^\s*(\{.*\})\s*(#.*)?$/

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Renders a parsed flow map back onto one line, keeping the source's inner padding (`{ a: 1 }` vs
 * `{a: 1}`) so an edit changes only the patched value. */
function formatFlowMap(map: Record<string, unknown>, padded: boolean): string {
  const entries = Object.entries(map).map(([key, value]) => {
    const renderedKey = dump(key, { flowLevel: 0 }).trim()
    const renderedValue = isPlainObject(value) ? formatFlowMap(value, padded) : dump(value, { flowLevel: 0, lineWidth: -1 }).trim()
    return `${renderedKey}: ${renderedValue}`
  })
  if (entries.length === 0) return '{}'
  return padded ? `{ ${entries.join(', ')} }` : `{${entries.join(', ')}}`
}

/**
 * Patches a leaf that lives inside a one-line flow map (`"1": { max: 2, used: 0 }` → `used` under
 * `1`), which the line-based walk can't see since the map's keys aren't lines of their own. Returns
 * `false` when no ancestor of `keyPath` is such a flow map (the caller falls back to its block-mapping
 * handling); throws when one is but the leaf can't be set without guessing.
 */
function patchFlowMapLine(lines: string[], keyPath: string[], value: number | boolean, createIfMissing: boolean): boolean {
  for (let depth = keyPath.length - 1; depth > 0; depth--) {
    const ancestorLine = findKeyLineOrNull(lines, keyPath.slice(0, depth))
    if (ancestorLine === null) continue

    const keyMatch = KEY_LINE_RE.exec(lines[ancestorLine])!
    const flowMatch = FLOW_MAP_VALUE_RE.exec(keyMatch[3])
    if (!flowMatch) return false // a block mapping (or scalar) — not ours to handle

    let map: unknown
    try {
      map = load(flowMatch[1])
    } catch {
      throw new YamlPatchError(`cannot parse flow map at ${keyPath.slice(0, depth).join('.')}`)
    }
    if (!isPlainObject(map)) throw new YamlPatchError(`${keyPath.slice(0, depth).join('.')} is not a flow map`)

    let node = map
    const rest = keyPath.slice(depth)
    for (const key of rest.slice(0, -1)) {
      const child = node[key]
      if (child === undefined && createIfMissing) node[key] = {}
      else if (!isPlainObject(child)) throw new YamlPatchError(`key path not found: ${keyPath.join('.')}`)
      node = node[key] as Record<string, unknown>
    }
    const leaf = rest[rest.length - 1]
    if (!(leaf in node) && !createIfMissing) throw new YamlPatchError(`key path not found: ${keyPath.join('.')}`)
    if (isPlainObject(node[leaf]) || Array.isArray(node[leaf])) throw new YamlPatchError(`${keyPath.join('.')} is not a scalar`)
    node[leaf] = value

    const padded = /^\{\s/.test(flowMatch[1])
    const comment = flowMatch[2] ? ` ${flowMatch[2]}` : ''
    lines[ancestorLine] = `${keyMatch[1]}${keyMatch[2]}: ${formatFlowMap(map, padded)}${comment}`
    return true
  }
  return false
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
    const key = normalizeKey(keyMatch[2])
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
    stack.push({ indent, key })

    const path = stack.map((s) => s.key)
    if (path.length === keyPath.length && path.every((k, idx) => k === keyPath[idx])) return i
  }

  return null
}

/**
 * Adds a missing key path — only for optional fields whose key may simply be absent (e.g. `hp.temp`,
 * or `conditions.exhaustion` with no `conditions` block yet). The deepest ancestor that does exist
 * gets the missing keys as its last children, nested as block mappings; with no ancestor at all they
 * go at the end of the frontmatter. That existing ancestor must be a block mapping (`hp:` with
 * nothing after the colon): a flow map (`hp: { current: 3 }`) or a scalar still throws rather than
 * guessing.
 */
function insertMissingPath(lines: string[], keyPath: string[], formatted: string): void {
  let depth = keyPath.length - 1
  let ancestorLine: number | null = null
  for (; depth > 0; depth--) {
    ancestorLine = findKeyLineOrNull(lines, keyPath.slice(0, depth))
    if (ancestorLine !== null) break
  }

  let insertAt: number
  let indent: number
  let step = 2
  if (ancestorLine === null) {
    insertAt = lines.length
    while (insertAt > 0 && lines[insertAt - 1].trim() === '') insertAt--
    indent = 0
  } else {
    const ancestorMatch = KEY_LINE_RE.exec(lines[ancestorLine])!
    const ancestorValue = ancestorMatch[3].trim()
    if (ancestorValue !== '' && !ancestorValue.startsWith('#')) {
      throw new YamlPatchError(`cannot add ${keyPath.join('.')}: ${keyPath.slice(0, depth).join('.')} is not a block mapping`)
    }
    const ancestorIndent = ancestorMatch[1].length

    let childIndent: number | null = null
    let lastChild = ancestorLine
    for (let i = ancestorLine + 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '' || line.trim().startsWith('#')) continue
      const lineIndent = /^( *)/.exec(line)![1].length
      if (lineIndent <= ancestorIndent) break
      childIndent ??= lineIndent
      lastChild = i
    }
    indent = childIndent ?? ancestorIndent + 2
    step = indent - ancestorIndent
    insertAt = lastChild + 1
  }

  const missing = keyPath.slice(depth)
  const added = missing.map((key, i) => {
    const prefix = ' '.repeat(indent + i * step)
    return i === missing.length - 1 ? `${prefix}${key}: ${formatted}` : `${prefix}${key}:`
  })
  lines.splice(insertAt, 0, ...added)
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
    if (!patchFlowMapLine(lines, keyPath, value, options.createIfMissing ?? false)) {
      if (!options.createIfMissing) throw new YamlPatchError(`key path not found: ${keyPath.join('.')}`)
      insertMissingPath(lines, keyPath, formatValue(value))
    }
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
