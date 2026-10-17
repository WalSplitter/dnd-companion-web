import { isRecord } from '../frontmatterFields'
import type { RawFile } from '../rawFile'
import { JOURNAL_KINDS, type CharacterWriteTargets, type JournalEntry, type JournalKind } from '../types'
import { linkFile } from '../wikilinkSyntax'

/**
 * A character's journal: the player's notes from the table, kept as a `journal:` list in the app's own
 * schema —
 *
 *     journal:
 *       - session: 7
 *         date: '2026-10-12'
 *         kind: quest
 *         title: Den Wolfspass sichern
 *         text: |-
 *           Brom will 50 GM, wenn wir die Wölfe vertreiben.
 *
 * It lives on its own note, `Tagebuch <Name>.md` next to the character, linked back through
 * `Charakter: "[[<Name>]]"` like the inventory note — so a growing journal never crowds the character
 * sheet, and the sheet can change shape without touching the notes. A `journal:` already on the
 * character's own file (or any other back-linked note) is used instead, the same precedence as
 * `resolveLinkedFields`. Without one, the note is created on the first entry.
 */

let nextId = 0
/** A fresh runtime id for a journal entry (see `JournalEntry.id`). */
export const newJournalId = () => `j${(++nextId).toString(36)}`

function text(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  return typeof value === 'number' ? String(value) : undefined
}

/** `YYYY-MM-DD` — YAML reads an unquoted date as a `Date`. */
function isoDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  const raw = text(value)
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined
}

function kindOf(value: unknown): JournalKind {
  return typeof value === 'string' && (JOURNAL_KINDS as readonly string[]).includes(value) ? (value as JournalKind) : 'note'
}

/** The entries of a `journal:` list; a bare string is a plain note. Entries without text or title are dropped. */
export function parseJournal(raw: unknown): JournalEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item): JournalEntry[] => {
    if (typeof item === 'string') return item.trim() ? [{ id: newJournalId(), kind: 'note', text: item.trim() }] : []
    if (!isRecord(item)) return []
    const entry: JournalEntry = { id: newJournalId(), kind: kindOf(item.kind), text: text(item.text) ?? '' }
    const title = text(item.title)
    if (title) entry.title = title
    if (typeof item.session === 'number' && Number.isFinite(item.session)) entry.session = item.session
    const date = isoDate(item.date)
    if (date) entry.date = date
    if (item.pinned === true) entry.pinned = true
    if (item.done === true) entry.done = true
    return entry.text || entry.title ? [entry] : []
  })
}

/** What's written for each entry: no runtime `id`, no `false` flags, keys in reading order. */
export function serializeJournal(entries: JournalEntry[]): Record<string, unknown>[] {
  return entries.map((e) => ({
    ...(e.session !== undefined ? { session: e.session } : {}),
    ...(e.date ? { date: e.date } : {}),
    kind: e.kind,
    ...(e.title ? { title: e.title } : {}),
    ...(e.pinned ? { pinned: true } : {}),
    ...(e.done ? { done: true } : {}),
    text: e.text,
  }))
}

/** Text of a new journal note for the character file `characterName`. */
export function journalNoteContent(characterName: string): string {
  return `---\nCharakter: "[[${characterName}]]"\n---\n\nTagebuch zu [[${characterName}]].\n`
}

const folderOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '')

/**
 * The character's journal and the file it's written to: the first of its own file and the notes
 * linking back to it that has a `journal:` list, else an existing back-linked `Tagebuch…` note, else a
 * `Tagebuch <Name>.md` to create in the character's folder.
 */
export function resolveJournal(own: RawFile, files: RawFile[]): { journal: JournalEntry[]; target: NonNullable<CharacterWriteTargets['journal']> } {
  const name = own.name.trim().toLowerCase()
  const linked = files.filter((f) => f !== own && linkFile(f.data.Charakter).toLowerCase() === name)
  const source = [own, ...linked].find((f) => Array.isArray(f.data.journal))
  if (source) return { journal: parseJournal(source.data.journal), target: { path: source.path } }

  const path = `${folderOf(own.path)}Tagebuch ${own.name}.md`
  const existing = linked.find((f) => /^tagebuch\b/i.test(f.name)) ?? files.find((f) => f.path === path)
  return { journal: [], target: existing ? { path: existing.path } : { path, create: journalNoteContent(own.name) } }
}

/** The session the next note most likely belongs to: the highest one written so far. */
export function currentSession(entries: JournalEntry[]): number | undefined {
  let max: number | undefined
  for (const e of entries) if (e.session !== undefined && (max === undefined || e.session > max)) max = e.session
  return max
}
