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
 */

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

export function patchFrontmatterField(content: string, keyPath: string[], value: number | boolean): string {
  if (keyPath.length === 0) throw new YamlPatchError('empty key path')

  const match = FRONTMATTER_RE.exec(content)
  if (!match) throw new YamlPatchError('no frontmatter block found')
  const [, openDelim, yamlText, closeDelim, rest] = match

  const newline = yamlText.includes('\r\n') ? '\r\n' : '\n'
  const lines = yamlText.split(/\r?\n/)

  const stack: { indent: number; key: string }[] = []
  let targetLine = -1

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
    if (path.length === keyPath.length && path.every((k, idx) => k === keyPath[idx])) {
      targetLine = i
      break
    }
  }

  if (targetLine === -1) throw new YamlPatchError(`key path not found: ${keyPath.join('.')}`)

  const keyMatch = KEY_LINE_RE.exec(lines[targetLine])!
  lines[targetLine] = `${keyMatch[1]}${keyMatch[2]}: ${formatValue(value)}`

  return openDelim + lines.join(newline) + closeDelim + rest
}
