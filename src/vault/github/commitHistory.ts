/**
 * Reads back what `commitMessage` wrote: which character's fields an app commit changed, from what to
 * what. Commits made anywhere else (Obsidian Git's "vault backup", a hand-written commit) don't parse.
 */

/** One body line of an app commit. */
export type CommitChange =
  | { kind: 'set'; key: string; from: string | null; to: string | null; file?: string }
  /** A block too large to spell out (a whole inventory) — only that it changed. */
  | { kind: 'updated'; key: string; file?: string }
  | { kind: 'created'; note: string }

export interface AppCommit {
  /** Changes per character, in the order the body lists them. */
  groups: { character: string; changes: CommitChange[] }[]
  /** The `Edited-by` trailer's login, without the `@`. */
  editedBy: string | null
}

/** The trailer every app commit ends with. */
const VIA_TRAILER = /^Via: D&D Companion\b/m
const EDITED_BY = /^Edited-by: @(\S+)\s*$/m
/** `Dummy Charakter:` — a character's group header. */
const GROUP_HEADER = /^(\S.*):$/
/** ` (Spell Sheet.md)` — added when one character's edits span several notes. */
const FILE_SUFFIX = / \(([^()]+\.md)\)$/
/** `formatValue` writes a missing value as an en dash. */
const value = (raw: string) => (raw === '–' ? null : raw)

function parseChange(line: string): CommitChange | null {
  const fileMatch = FILE_SUFFIX.exec(line)
  const file = fileMatch?.[1]
  const text = fileMatch ? line.slice(0, fileMatch.index) : line
  const created = /^created (.+)\.md$/.exec(text)
  if (created) return { kind: 'created', note: created[1] }
  const updated = /^(\S+): updated$/.exec(text)
  if (updated) return { kind: 'updated', key: updated[1], ...(file && { file }) }
  const set = /^(\S+): (.*?) → (.*)$/.exec(text)
  if (set) return { kind: 'set', key: set[1], from: value(set[2]), to: value(set[3]), ...(file && { file }) }
  return null
}

/** The changes an app commit records, or `null` for a commit the app didn't make. */
export function parseAppCommit(message: string): AppCommit | null {
  if (!VIA_TRAILER.test(message)) return null
  const groups: AppCommit['groups'] = []
  // The subject (first line) only summarizes the body.
  for (const raw of message.split(/\r?\n/).slice(1)) {
    const line = raw.trimEnd()
    if (line.startsWith('- ')) {
      const change = parseChange(line.slice(2))
      if (change && groups.length > 0) groups[groups.length - 1].changes.push(change)
      continue
    }
    const header = GROUP_HEADER.exec(line)
    if (header) groups.push({ character: header[1], changes: [] })
  }
  return { groups: groups.filter((g) => g.changes.length > 0), editedBy: EDITED_BY.exec(message)?.[1] ?? null }
}
