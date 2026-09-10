/**
 * Obsidian note bodies in this vault are full of syntax with no equivalent here: `[[Name]]` /
 * `[[Name|Alias]]` wikilinks, dynamic-embed / meta-bind-button / dataviewjs code fences, and
 * callout/heading structure meant for Obsidian's renderer. These helpers turn that into plain
 * prose good enough to show in a `<p>` — not a full markdown renderer, just enough to stop
 * literal `[[...]]` brackets and code fences from leaking into the UI.
 */

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

/** Resolves every wikilink anywhere in `text` to its display text (alias, or the link target). */
export function resolveWikilinksInText(text: string): string {
  return text.replace(WIKILINK_RE, (_match, target: string, alias?: string) => (alias ?? target).trim())
}

/**
 * Reduces an Obsidian note body to a single block of plain prose: drops fenced code blocks
 * (`` ``` `` — dynamic-embed/meta-bind-button/dataviewjs and similar), heading lines, and
 * blockquote/callout lines, resolves wikilinks, and collapses everything else into one paragraph.
 */
export function cleanObsidianBody(raw: string): string {
  const lines = raw.split(/\r?\n/)
  const kept: string[] = []
  let inFence = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence || trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('>')) continue
    kept.push(trimmed.replace(/^[-*]\s+/, ''))
  }

  return resolveWikilinksInText(kept.join(' '))
    .replace(/\*\*?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
