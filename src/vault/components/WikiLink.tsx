import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useVaultIndex } from '../VaultIndexContext'
import { basename, resolveWikilink, type ResolvedWikilink } from '../wikilinks'

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
const HOVER_OPEN_DELAY_MS = 350

const KIND_LABEL: Record<ResolvedWikilink['kind'], string> = {
  character: 'Character',
  item: 'Item',
  spell: 'Spell',
  note: 'Note',
  unresolved: 'Unresolved',
}

/** Turns every `[[Target]]` / `[[Target|Alias]]` in a single line of text into a clickable
 * `WikiLink`, leaving surrounding plain text untouched. Used by `renderObsidianBody` below and by
 * any component that only ever has single-line text to render (e.g. a feature name). */
export function renderObsidianLine(line: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let i = 0
  WIKILINK_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = WIKILINK_RE.exec(line))) {
    if (match.index > lastIndex) nodes.push(line.slice(lastIndex, match.index))
    const [, target, alias] = match
    nodes.push(<WikiLink key={`${keyPrefix}-link-${i++}`} target={target.trim()} display={alias ? alias.trim() : basename(target)} />)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < line.length) nodes.push(line.slice(lastIndex))
  return nodes.length > 0 ? nodes : [line]
}

/**
 * Renders a raw Obsidian note body as readable prose: drops fenced code blocks (dynamic-embed /
 * meta-bind-button / dataviewjs and similar), heading/blockquote/callout lines, and bold markers,
 * keeps paragraph breaks, and turns wikilinks into clickable `WikiLink`s instead of flattening them
 * to plain text.
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

/**
 * A clickable rendering of an Obsidian `[[Wikilink]]`. Opens a small popover with the resolved
 * target's content — on click (stays open, "pinned", until dismissed) or on hover (closes again on
 * mouse-out) — mirroring how Obsidian's own hover preview / click-to-open works.
 */
export function WikiLink({ target, display }: { target: string; display: string }) {
  const index = useVaultIndex()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLSpanElement>(null)

  const resolved = resolveWikilink(index, target)

  useEffect(() => {
    if (!pinned) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPinned(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setPinned(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pinned])

  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  return (
    <span ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (open && pinned) {
            setOpen(false)
            setPinned(false)
          } else {
            setOpen(true)
            setPinned(true)
          }
        }}
        onMouseEnter={() => {
          clearTimeout(hoverTimer.current)
          hoverTimer.current = setTimeout(() => setOpen(true), HOVER_OPEN_DELAY_MS)
        }}
        onMouseLeave={() => {
          clearTimeout(hoverTimer.current)
          if (!pinned) setOpen(false)
        }}
        className={
          resolved.kind === 'unresolved'
            ? 'cursor-help border-b border-dashed border-fg-muted/50 text-fg-muted no-underline'
            : 'cursor-pointer border-b border-primary/40 text-primary no-underline hover:border-primary'
        }
      >
        {display}
      </button>
      {open && <WikiLinkPopover resolved={resolved} onClose={() => setOpen(false)} />}
    </span>
  )
}

function WikiLinkPopover({ resolved, onClose }: { resolved: ResolvedWikilink; onClose: () => void }) {
  return (
    <span
      role="dialog"
      className="absolute left-0 top-full z-50 mt-1.5 w-72 max-w-[80vw] rounded-lg border border-border bg-surface p-3 text-left align-top shadow-lg"
    >
      <span className="mb-1 flex items-start justify-between gap-2">
        <span className="font-semibold text-fg">{resolved.name}</span>
        <button type="button" onClick={onClose} className="text-xs text-fg-muted hover:text-fg" aria-label="Close">
          ✕
        </button>
      </span>
      <span className="mb-1.5 block text-xs uppercase tracking-wide text-fg-muted">
        {KIND_LABEL[resolved.kind]}
        {resolved.summary ? ` · ${resolved.summary}` : ''}
      </span>
      {resolved.kind === 'unresolved' ? (
        <span className="block text-sm text-fg-muted">No note found for “{resolved.name}”.</span>
      ) : (
        <span className="block max-h-64 overflow-y-auto text-sm text-fg-muted [&_p]:mb-0">
          {renderObsidianBody(resolved.body) ?? <span className="italic">No description.</span>}
        </span>
      )}
      {resolved.kind === 'character' && (
        <Link
          to={`/characters/${encodeURIComponent(resolved.name)}`}
          className="mt-2 inline-block text-xs text-primary hover:underline"
          onClick={onClose}
        >
          Open full sheet →
        </Link>
      )}
    </span>
  )
}
