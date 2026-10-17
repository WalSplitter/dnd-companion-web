import type { TranslationKey } from '../../i18n/useI18n'
import { fold } from '../../utils/fold'
import type { JournalEntry, JournalKind } from '../../vault/types'

/** Which entries the journal shows: one kind or all, and a free-text search. */
export interface JournalFilter {
  kind: JournalKind | 'all'
  query: string
}

/** One session's entries, newest first. `session` is undefined for notes not tied to a session. */
export interface SessionGroup {
  session: number | undefined
  entries: JournalEntry[]
  /** Earliest and latest date written in the session. */
  from?: string
  to?: string
}

/** Entries of the filter's kind whose title or text contains every word of the query. */
export function filterEntries(entries: JournalEntry[], filter: JournalFilter): JournalEntry[] {
  const words = fold(filter.query).split(/\s+/).filter(Boolean)
  return entries.filter((e) => {
    if (filter.kind !== 'all' && e.kind !== filter.kind) return false
    if (words.length === 0) return true
    const haystack = fold(`${e.title ?? ''} ${e.text}`)
    return words.every((w) => haystack.includes(w))
  })
}

/**
 * Entries grouped by session, newest session first and the newest entry first within it — what was
 * just written appears right under the composer. The journal is kept oldest first, so "newest" is
 * its order. Notes without a session come last.
 */
export function groupBySession(entries: JournalEntry[]): SessionGroup[] {
  const groups = new Map<number | undefined, JournalEntry[]>()
  for (const entry of [...entries].reverse()) groups.set(entry.session, [...(groups.get(entry.session) ?? []), entry])
  return [...groups]
    .sort(([a], [b]) => (a === undefined ? 1 : b === undefined ? -1 : b - a))
    .map(([session, list]) => {
      const dates = list.flatMap((e) => (e.date ? [e.date] : [])).sort()
      return { session, entries: list, from: dates[0], to: dates.at(-1) }
    })
}

/** How many entries each kind has. */
export function countByKind(entries: JournalEntry[]): Partial<Record<JournalKind, number>> {
  const counts: Partial<Record<JournalKind, number>> = {}
  for (const e of entries) counts[e.kind] = (counts[e.kind] ?? 0) + 1
  return counts
}

/** Today in the viewer's time zone, as `YYYY-MM-DD`. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** `2026-10-12` as a short local date (`12. Okt. 2026`). Parsed as a calendar day, not UTC midnight. */
export function formatJournalDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** `entries` with `id` changed by `change` (removed when `change` returns null). */
export function updateEntry(entries: JournalEntry[], id: string, change: (entry: JournalEntry) => JournalEntry | null): JournalEntry[] {
  return entries.flatMap((e) => {
    if (e.id !== id) return [e]
    const next = change(e)
    return next ? [next] : []
  })
}

export const KIND_LABEL: Record<JournalKind, TranslationKey> = {
  note: 'journal.kind.note',
  quest: 'journal.kind.quest',
  npc: 'journal.kind.npc',
  place: 'journal.kind.place',
  loot: 'journal.kind.loot',
  lore: 'journal.kind.lore',
}

/**
 * Per-kind colors — fixed hues rather than theme tokens (like the inventory's item kinds), at
 * opacities that read on every theme. `text` for icons, `tint` for a selected chip and the entry's
 * timeline medallion, `edge` for its card's left border.
 */
export const KIND_STYLE: Record<JournalKind, { text: string; tint: string; edge: string }> = {
  note: { text: 'text-sky-500', tint: 'border-sky-500/70 bg-sky-500/15', edge: 'border-l-sky-500/70' },
  quest: { text: 'text-amber-500', tint: 'border-amber-500/70 bg-amber-500/15', edge: 'border-l-amber-500/70' },
  npc: { text: 'text-rose-500', tint: 'border-rose-500/70 bg-rose-500/15', edge: 'border-l-rose-500/70' },
  place: { text: 'text-emerald-500', tint: 'border-emerald-500/70 bg-emerald-500/15', edge: 'border-l-emerald-500/70' },
  loot: { text: 'text-fuchsia-500', tint: 'border-fuchsia-500/70 bg-fuchsia-500/15', edge: 'border-l-fuchsia-500/70' },
  lore: { text: 'text-indigo-400', tint: 'border-indigo-400/70 bg-indigo-400/15', edge: 'border-l-indigo-400/70' },
}
