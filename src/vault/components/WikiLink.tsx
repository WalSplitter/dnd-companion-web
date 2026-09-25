import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useT, type TranslationKey } from '../../i18n/useI18n'
import { useVaultIndex } from '../useVaultIndex'
import { resolveWikilink, type ResolvedWikilink } from '../wikilinks'
import { renderObsidianBody } from './renderObsidian'

const HOVER_OPEN_DELAY_MS = 350
const DIALOG_WIDTH_PX = 320
const DIALOG_GAP_PX = 6

const KIND_KEY: Record<ResolvedWikilink['kind'], TranslationKey> = {
  character: 'wikilink.character',
  item: 'wikilink.item',
  spell: 'wikilink.spell',
  note: 'wikilink.note',
  unresolved: 'wikilink.unresolved',
}

/**
 * A clickable rendering of an Obsidian `[[Wikilink]]` (or a backticked reference) as a link tag.
 * Opens a dialog with the resolved target's content — on click (stays open, "pinned", until
 * dismissed) or on hover (closes again on mouse-out) — mirroring how Obsidian's own hover preview /
 * click-to-open works. Targets that don't resolve to a vault page get a muted, dashed tag and a
 * "no note found" dialog instead.
 */
export function WikiLink({ target, display }: { target: string; display: string }) {
  const index = useVaultIndex()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const anchorRef = useRef<HTMLButtonElement>(null)
  // The dialog is portaled to <body> so no clipping `overflow` ancestor can cut it off. React
  // synthetic events still bubble through the portal to the wrapper span, which is how a pointer-down
  // inside the dialog (or inside a nested link's dialog) is told apart from a click outside.
  const insideRef = useRef(false)

  const resolved = resolveWikilink(index, target)

  useEffect(() => {
    if (!pinned) return
    insideRef.current = false
    function onPointerDown() {
      if (insideRef.current) {
        insideRef.current = false
        return
      }
      setOpen(false)
      setPinned(false)
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

  function close() {
    setOpen(false)
    setPinned(false)
  }

  return (
    <span onPointerDown={() => (insideRef.current = true)}>
      <button
        ref={anchorRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (open && pinned) {
            close()
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
        className={`inline-block max-w-full rounded-sm px-1 text-left no-underline transition [overflow-wrap:anywhere] ${
          resolved.kind === 'unresolved'
            ? 'cursor-help border-b border-dashed border-fg-muted/50 bg-fg/5 text-fg-muted'
            : 'cursor-pointer border-b border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
        }`}
      >
        {display}
      </button>
      {open && <WikiLinkDialog resolved={resolved} fallbackName={display} anchorRef={anchorRef} onClose={close} />}
    </span>
  )
}

/** Fixed-position placement under (or, near the bottom edge, above) the anchor, kept inside the viewport. */
function useAnchoredPosition(anchorRef: RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState<{ left: number; top?: number; bottom?: number } | null>(null)

  useLayoutEffect(() => {
    function update() {
      const anchor = anchorRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const width = Math.min(DIALOG_WIDTH_PX, window.innerWidth - 16)
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
      const spaceBelow = window.innerHeight - rect.bottom
      setPosition(
        spaceBelow < 280 && rect.top > spaceBelow
          ? { left, bottom: window.innerHeight - rect.top + DIALOG_GAP_PX }
          : { left, top: rect.bottom + DIALOG_GAP_PX },
      )
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [anchorRef])

  return position
}

function WikiLinkDialog({
  resolved,
  fallbackName,
  anchorRef,
  onClose,
}: {
  resolved: ResolvedWikilink
  fallbackName: string
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const t = useT()
  const position = useAnchoredPosition(anchorRef)
  const name = resolved.name || fallbackName
  if (!position) return null

  return createPortal(
    <div
      role="dialog"
      aria-label={name}
      className="rpg-panel fixed z-50 max-h-[70vh] bg-surface p-3 text-left shadow-2xl"
      style={{ ...position, width: Math.min(DIALOG_WIDTH_PX, window.innerWidth - 16) }}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="font-display text-sm font-bold tracking-wide text-fg [overflow-wrap:anywhere]">{name}</span>
        <button type="button" onClick={onClose} className="cursor-pointer text-xs text-fg-muted hover:text-fg" aria-label={t('common.close')}>
          ✕
        </button>
      </div>
      <div className="mb-1.5 text-xs uppercase tracking-wide text-trim">
        {t(KIND_KEY[resolved.kind])}
        {resolved.spellLevel !== undefined && ` · ${resolved.spellLevel === 0 ? t('spells.cantripBadge') : t('spells.levelBadge', { level: resolved.spellLevel })}`}
        {resolved.summary ? ` · ${resolved.summary}` : ''}
      </div>
      {resolved.kind === 'unresolved' ? (
        <div className="text-sm text-fg-muted">{t('wikilink.noNoteFound', { name })}</div>
      ) : (
        <div className="max-h-64 overflow-y-auto text-sm text-fg-muted [overflow-wrap:anywhere]">
          {renderObsidianBody(resolved.body) ?? <span className="italic">{t('wikilink.noDescription')}</span>}
        </div>
      )}
      {resolved.kind === 'character' && (
        <Link
          to={`/characters/${encodeURIComponent(resolved.name)}`}
          className="mt-2 inline-block text-xs text-primary hover:underline"
          onClick={onClose}
        >
          {t('wikilink.openFullSheet')}
        </Link>
      )}
    </div>,
    document.body,
  )
}
