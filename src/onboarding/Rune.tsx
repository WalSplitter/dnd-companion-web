import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { useDismiss } from '../components/useDismiss'
import { useT } from '../i18n/useI18n'
import { inOwlbear } from '../owlbear/host'
import { clamp } from '../utils/viewport'
import type { CharacterFrontmatter } from '../vault/types'
import { LEXICON, lexiconRuleset, type LexiconEntry, type LexiconTerm } from './lexicon'
import { useQuestStore } from './questStore'

const CARD_WIDTH = 288
const MARGIN = 8

/**
 * A rune beside a rules term (learn mode only): it glows until read, then fades to a faint mark.
 * A click opens its lexicon card — what the term means under the character's rules, with an example.
 * Nothing renders for a term those rules don't have, outside learn mode, or in Owlbear.
 */
export function Rune({ term, character }: { term: LexiconTerm; character: Pick<CharacterFrontmatter, 'ruleset'> }) {
  // The only store read while hidden — the sheet has many runes, and learn mode is usually off.
  const shown = useQuestStore((s) => s.enabled && s.learnMode)
  const entry = LEXICON[term]
  const body = entry.body[lexiconRuleset(character)]
  if (inOwlbear || !shown || !body) return null
  return <RuneButton term={term} entry={entry} body={body} />
}

function RuneButton({ term, entry, body }: { term: LexiconTerm; entry: LexiconEntry; body: NonNullable<LexiconEntry['body']['endeavour']> }) {
  const t = useT()
  const read = useQuestStore((s) => s.readTerms.includes(term))
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  useDismiss(open, () => setOpen(false), [buttonRef, cardRef])

  // Below the rune, above it when there's no room, kept inside the viewport.
  useLayoutEffect(() => {
    if (!open) return
    const r = buttonRef.current?.getBoundingClientRect()
    const h = cardRef.current?.getBoundingClientRect().height ?? 0
    if (!r) return
    const width = Math.min(CARD_WIDTH, window.innerWidth - 2 * MARGIN)
    const below = r.bottom + 8
    const top = below + h <= window.innerHeight - MARGIN ? below : Math.max(MARGIN, r.top - 8 - h)
    setPos({ top, width, left: clamp(r.left + r.width / 2 - width / 2, MARGIN, window.innerWidth - width - MARGIN) })
  }, [open])

  const toggle = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!open) useQuestStore.getState().markRead(term)
    setOpen((o) => !o)
  }
  const label = t('quest.runeLabel', { term: t(entry.title) })

  return (
    <>
      <button ref={buttonRef} type="button" onClick={toggle} className={`quest-rune ${read ? 'is-read' : ''}`} aria-expanded={open} aria-label={label} title={label}>
        <svg viewBox="0 0 16 16" aria-hidden>
          <path d="M8 1.5 13.5 8 8 14.5 2.5 8Z" className="quest-rune-gem" />
          <path d="M8 4.5v7M5.8 6.5 8 8.6l2.2-2.1" className="quest-rune-glyph" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={cardRef}
            role="dialog"
            aria-label={t(entry.title)}
            className="quest-lexicon-card"
            style={pos ?? { top: 0, left: 0, width: CARD_WIDTH, visibility: 'hidden' }}
          >
            <div className="quest-lexicon-head">
              <span aria-hidden>{entry.icon}</span>
              <span className="flex-1">{t(entry.title)}</span>
            </div>
            <p>{t(body)}</p>
            <button
              type="button"
              className="quest-link mt-2 text-xs"
              onClick={() => {
                setOpen(false)
                useQuestStore.getState().openLog('compendium')
              }}
            >
              {t('quest.toCompendium')}
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
