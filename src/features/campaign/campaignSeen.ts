import type { JournalEntry } from '../../vault/types'

/**
 * Which campaign journal entries this device has already shown — so a player sees at a glance what the
 * DM added since their last look ("Neu" on the entry, a count on the tab). Per device and vault, in
 * localStorage; entries are recognized by what they say, since their ids are runtime-only.
 */

const SEEN_KEY = 'dnd-companion-campaign-seen:'

/** A short fingerprint of an entry's content — changes when the DM edits it, so an edit shows as new too. */
export function entryMark(entry: JournalEntry): string {
  const source = `${entry.kind}\u0000${entry.title ?? ''}\u0000${entry.text}\u0000${entry.session ?? ''}`
  let hash = 5381
  for (let i = 0; i < source.length; i++) hash = ((hash * 33) ^ source.charCodeAt(i)) >>> 0
  return hash.toString(36)
}

/** The marks seen on this device so far; `null` before the first look (then nothing counts as new). */
export function loadSeen(vaultKey: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY + vaultKey)
    return raw === null ? null : new Set(JSON.parse(raw) as string[])
  } catch {
    return null
  }
}

export function saveSeen(vaultKey: string, marks: Iterable<string>): void {
  try {
    localStorage.setItem(SEEN_KEY + vaultKey, JSON.stringify([...marks]))
  } catch {
    // Storage full or blocked: entries just keep showing as new.
  }
}

/** The entries not seen on this device yet (none before the first look). */
export function unseenEntries(entries: JournalEntry[], seen: Set<string> | null): JournalEntry[] {
  return seen ? entries.filter((e) => !seen.has(entryMark(e))) : []
}
