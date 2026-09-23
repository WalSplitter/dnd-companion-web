import type { ReactNode } from 'react'
import { basename } from '../wikilinks'
import { WikiLink } from './WikiLink'

/** Matches `[[Target]]` / `[[Target|Alias]]`, or an inline-code span (`Target`) — notes commonly mark
 * vault references (tags, field names, note titles) with backticks instead of brackets. */
const REFERENCE_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|`([^`\n]+)`/g

/** Turns every `[[Target]]` / `[[Target|Alias]]` — and every inline-code span — in a single line of
 * text into a clickable `WikiLink`, leaving surrounding plain text untouched. Used by
 * `renderObsidianBody` below and by any component that only ever has single-line text to render
 * (e.g. a feature name). */
export function renderObsidianLine(line: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let i = 0
  REFERENCE_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = REFERENCE_RE.exec(line))) {
    if (match.index > lastIndex) nodes.push(line.slice(lastIndex, match.index))
    const [, target, alias, code] = match
    const key = `${keyPrefix}-link-${i++}`
    nodes.push(
      code !== undefined ? (
        <WikiLink key={key} target={code.trim()} display={code.trim()} />
      ) : (
        <WikiLink key={key} target={target.trim()} display={alias ? alias.trim() : basename(target)} />
      ),
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < line.length) nodes.push(line.slice(lastIndex))
  return nodes.length > 0 ? nodes : [line]
}

/**
 * Renders a raw Obsidian note body as readable prose: drops fenced code blocks (dynamic-embed /
 * meta-bind-button / dataviewjs and similar), heading/blockquote/callout lines, and bold markers,
 * keeps paragraph breaks, and turns wikilinks and inline-code references into clickable
 * `WikiLink`s instead of flattening them to plain text.
 */
export function renderObsidianBody(raw: string | undefined): ReactNode {
  if (!raw) return null
  const lines = raw.split(/\r?\n/)
  const kept: string[] = []
  let inFence = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence || trimmed.startsWith('#') || trimmed.startsWith('>')) continue
    kept.push(trimmed.replace(/^[-*]\s+/, '').replace(/\*\*?/g, ''))
  }

  const paragraphs: string[] = []
  let current: string[] = []
  for (const line of kept) {
    if (line === '') {
      if (current.length > 0) {
        paragraphs.push(current.join(' '))
        current = []
      }
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) paragraphs.push(current.join(' '))

  if (paragraphs.length === 0) return null
  return (
    <>
      {paragraphs.map((p, idx) => (
        <p key={idx} className={idx > 0 ? 'mt-2' : undefined}>
          {renderObsidianLine(p, `p${idx}`)}
        </p>
      ))}
    </>
  )
}
