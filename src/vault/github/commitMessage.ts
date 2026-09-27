import type { PendingEdit } from './githubSync'

/** Where the app lives — named in every commit it makes, so a history reader knows where it came from. */
export const APP_URL = 'https://github.com/WalSplitter/dnd-companion-web'

/** Git's conventional limit for a subject line. */
const SUBJECT_MAX = 72

/** Key segments that say *which part* of a value changed, not what the value is (`hp.current` → "hp"). */
const DETAIL_KEYS = new Set(['current', 'used', 'max', 'value', 'remaining', 'total', 'containers'])

/** Readable names for keys whose raw spelling reads badly in a sentence. */
const FIELD_NAMES: Record<string, string> = {
  endeavour_inventory: 'inventory',
  slots: 'spell slots',
  luck_points: 'luck',
  hit_dice: 'hit dice',
}

const noteName = (path: string) => (path.split('/').pop() ?? path).replace(/\.md$/i, '')

/** What a key path is about, in a word or two: `spellcasting.slots.1.used` → "spell slots". */
export function fieldName(keyPath: string[]): string {
  const meaningful = keyPath.filter((k) => !DETAIL_KEYS.has(k.toLowerCase()) && !/^\d+$/.test(k) && !/^grad_?\d+$/i.test(k))
  const key = meaningful.at(-1) ?? keyPath.at(-1) ?? ''
  return FIELD_NAMES[key] ?? key.replace(/_/g, ' ')
}

/** A Conventional Commits scope: `Dummy Charakter` → `dummy-charakter`. */
function scopeOf(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
}

/** "a", "a and b", "a, b and c". */
function listOf(items: string[]): string {
  return items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

function formatValue(value: unknown): string {
  return value === undefined ? '–' : typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/** `hp.current: 14 → 13`; a large block (a whole inventory) only says that it changed. */
function changeLine(edit: PendingEdit): string {
  const key = edit.patch.keyPath.join('.')
  const from = formatValue(edit.base)
  const to = formatValue(edit.patch.value)
  return from.length + to.length > 80 ? `${key}: updated` : `${key}: ${from} → ${to}`
}

/**
 * A commit message in the vault repository's own style (Conventional Commits, the character as scope):
 *
 *     chore(dummy-charakter): update hp, exhaustion and mana
 *
 *     Dummy Charakter:
 *     - hp.current: 14 → 13
 *     - conditions.exhaustion: 0 → 2
 *     - spellcasting.mana.current: 9 → 7 (Spell Sheet.md)
 *
 *     Edited-by: @WalSplitter
 *     Via: D&D Companion <https://github.com/WalSplitter/dnd-companion-web>
 *
 * Edits are grouped by character; a file name is added where one character's edits span several
 * notes. The trailers name the GitHub account (when known) and the app.
 */
export function commitMessage(edits: PendingEdit[], login?: string | null): string {
  const groups = new Map<string, PendingEdit[]>()
  for (const edit of edits) {
    const name = edit.character ?? noteName(edit.path)
    groups.set(name, [...(groups.get(name) ?? []), edit])
  }
  const names = [...groups.keys()]
  const fields = [...new Set(edits.map((e) => fieldName(e.patch.keyPath)))]

  let subject =
    names.length === 1 ? `chore(${scopeOf(names[0])}): update ${listOf(fields)}` : `chore(vault): update ${listOf(names)}`
  if (subject.length > SUBJECT_MAX) {
    subject = names.length === 1 ? `chore(${scopeOf(names[0])}): update ${fields.length} fields` : `chore(vault): update ${names.length} characters`
  }

  const body = [...groups].map(([name, group]) => {
    const spansNotes = new Set(group.map((e) => e.path)).size > 1
    const lines = group.map((e) => `- ${changeLine(e)}${spansNotes ? ` (${noteName(e.path)}.md)` : ''}`)
    return [`${name}:`, ...lines].join('\n')
  })

  const trailers = [...(login ? [`Edited-by: @${login}`] : []), `Via: D&D Companion <${APP_URL}>`]
  return [subject, ...body, trailers.join('\n')].join('\n\n')
}
