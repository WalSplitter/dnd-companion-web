import type { InlineItem } from '../types'

function stripWikilink(raw: string): string {
  const match = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/.exec(raw.trim())
  if (!match) return raw.trim()
  return (match[2] ?? match[1]).trim()
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function parseNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) ? value : undefined
}

/**
 * Finds a markdown heading matching `heading` and parses the pipe-table directly beneath it into
 * inline items, keyed by the German column names this vault format uses (`Gegenstand`/`Anzahl`/`Gewicht`).
 * Skips the vault's own "GESAMT" (total) row. Returns `[]` if the heading or table isn't found.
 */
export function extractItemTable(body: string, heading: string): InlineItem[] {
  const lines = body.split(/\r?\n/)
  const headingIdx = lines.findIndex((line) => line.replace(/^#+\s*/, '').trim().toLowerCase() === heading.toLowerCase())
  if (headingIdx === -1) return []

  let i = headingIdx + 1
  while (i < lines.length && !lines[i].trim().startsWith('|')) {
    if (lines[i].trim().startsWith('#')) return []
    i++
  }
  if (i >= lines.length) return []

  const headers = splitRow(lines[i]).map((h) => h.toLowerCase())
  i += 2 // header row + `| --- |` separator row

  const items: InlineItem[] = []
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    const cells = splitRow(lines[i])
    i++
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => (row[h] = cells[idx] ?? ''))

    const name = row['gegenstand']
    if (!name || name.toUpperCase() === 'GESAMT') continue

    items.push({
      name: stripWikilink(name),
      quantity: parseNumber(row['anzahl']) ?? 1,
      weight_lb: parseNumber(row['gewicht']),
    })
  }
  return items
}
