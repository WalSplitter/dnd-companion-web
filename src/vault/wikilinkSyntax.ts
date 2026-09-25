/**
 * Pure `[[Wikilink]]` string handling — no vault lookups, no imports — so every adapter and the
 * index in `wikilinks.ts` can share it without import cycles.
 */

const WIKILINK_RE = /^\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]$/

/** Obsidian occasionally stores a vault-relative full path instead of a bare filename (to
 * disambiguate two files sharing a basename elsewhere in the vault) — e.g. a self-referencing link
 * inside `Dunkelsicht.md` reading `[[_DnD_PFT/Regeln/.../Dunkelsicht]]` with no alias. Every file in
 * this app is indexed by basename only, so both lookups and display text need just the last path
 * segment, same as Obsidian shows when a link carries no alias. */
export function basename(target: string): string {
  const last = target.split('/').pop() ?? target
  return last.replace(/\.md$/i, '').trim()
}

/** Strips `[[...]]` wrapping and an optional `|alias`, returning the target's bare filename. */
export function wikilinkTarget(raw: string): string {
  const match = WIKILINK_RE.exec(raw.trim())
  return basename(match ? match[1] : raw.trim())
}

/** Alias-aware display text for a wikilink field, e.g. `"[[Zwerge|Zwerg]]"` -> `"Zwerg"`. Falls
 * back to the target's bare filename when there's no alias. Plain text passes through trimmed;
 * non-strings become `''`. */
export function linkDisplay(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const match = WIKILINK_RE.exec(raw.trim())
  if (!match) return raw.trim()
  return match[2] ? match[2].trim() : basename(match[1])
}

/** The target (filename) a wikilink field points at, ignoring any display alias; `''` for non-strings. */
export function linkFile(raw: unknown): string {
  return typeof raw === 'string' ? wikilinkTarget(raw) : ''
}
