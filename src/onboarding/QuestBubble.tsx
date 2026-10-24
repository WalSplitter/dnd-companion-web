import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n/useI18n'
import { clamp, headerHeight, PHONE_MAX_WIDTH, prefersReducedMotion } from '../utils/viewport'
import type { TargetBox } from './useTourTarget'

const GAP = 18
const MARGIN = 12
/** Below this height (a phone held sideways) there's no room above or below a target: the bubble
 * moves to the side of the screen the target isn't on. */
const SIDE_BELOW = 500
const TYPE_MS = 16

export interface BubbleAction {
  label: string
  onClick: () => void
  primary?: boolean
}

/** Writes `text` out letter by letter; `finish` shows it at once. Instant with reduced motion. */
function useTypewriter(text: string) {
  // Counted per text, so a new text starts from its first letter without resetting in an effect.
  const [typed, setTyped] = useState({ text, shown: 0 })
  const [instant] = useState(prefersReducedMotion)
  const shown = instant ? text.length : typed.text === text ? typed.shown : 0

  useEffect(() => {
    if (instant) return
    const timer = window.setInterval(() => {
      setTyped((prev) => {
        const n = prev.text === text ? prev.shown : 0
        if (n >= text.length) window.clearInterval(timer)
        return { text, shown: Math.min(text.length, n + 2) }
      })
    }, TYPE_MS)
    return () => window.clearInterval(timer)
  }, [text, instant])

  return { visible: text.slice(0, shown), rest: text.slice(shown), finish: () => setTyped({ text, shown: text.length }) }
}

/** Bumps when the window or `ref`'s own box resizes (a web font or the portrait loading later), for
 * layout effects that place things in viewport pixels. */
function useResizeTick(ref: RefObject<HTMLElement | null>) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener('resize', bump)
    const observer = new ResizeObserver(bump)
    if (ref.current) observer.observe(ref.current)
    return () => {
      window.removeEventListener('resize', bump)
      observer.disconnect()
    }
  }, [ref])
  return tick
}

/**
 * Splitter's speech bubble, an RPG dialogue box: its `portrait` on the left, the text on the right. It
 * sits beside the lit element (below it when there's room, else above), centred when the step has no
 * target, in the bottom-right `corner` for notices nobody asked for, and docked to the bottom on phones.
 * Its text types itself out (a click shows it whole).
 */
export function QuestBubble({
  box,
  heading,
  text,
  step,
  waiting,
  footnote,
  actions,
  onClose,
  autoFocus = true,
  portrait,
}: {
  /** What the bubble sits beside: the lit element, `null` (centred), or `'corner'`. */
  box: TargetBox | null | 'corner'
  heading: ReactNode
  text: string
  /** Step dots: index and total. */
  step?: { index: number; total: number }
  /** The step waits for the player to do something: shows the "your turn" cue. */
  waiting?: string
  footnote?: string
  actions: BubbleAction[]
  onClose?: () => void
  /** Moves focus to the primary button when the text changes. Off for bubbles nobody asked for, so
   * they never pull focus out of what the player is typing. */
  autoFocus?: boolean
  /** Who is speaking: Splitter's portrait, beside the text. */
  portrait?: ReactNode
}) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; sheet: boolean } | null>(null)
  const { visible, rest, finish } = useTypewriter(text)
  const resized = useResizeTick(ref)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // The layout size, not getBoundingClientRect(): that one is shrunk by the pop-in animation's scale
    // while the bubble appears, and would place it too far right.
    const width = el.offsetWidth
    const height = el.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    const minTop = headerHeight() + MARGIN
    let next: { top: number; left: number; sheet: boolean }
    if (vw < PHONE_MAX_WIDTH) {
      next = { top: vh - height - MARGIN, left: MARGIN, sheet: true }
    } else if (box === 'corner') {
      next = { top: vh - height - MARGIN, left: vw - width - MARGIN, sheet: false }
    } else if (box && vh < SIDE_BELOW) {
      next = { top: minTop, left: box.left + box.width / 2 < vw / 2 ? vw - width - MARGIN : MARGIN, sheet: false }
    } else if (box) {
      const below = box.top + box.height + GAP
      const above = box.top - GAP - height
      const top = below + height <= vh - MARGIN ? below : above >= minTop ? above : vh - height - MARGIN
      next = { top, left: clamp(box.left, MARGIN, vw - width - MARGIN), sheet: false }
    } else {
      next = { top: Math.max(minTop + 40, (vh - height) / 2), left: (vw - width) / 2, sheet: false }
    }
    // Taller than the room left (a phone held sideways): it scrolls inside, and never leaves the top.
    next.top = Math.max(next.sheet ? MARGIN : minTop, next.top)
    setPos((prev) => (prev && Math.abs(prev.top - next.top) < 0.5 && Math.abs(prev.left - next.left) < 0.5 && prev.sheet === next.sheet ? prev : next))
    // The bubble's own size changes with its text, the waiting cue and the buttons.
  }, [box, text, waiting, footnote, actions.length, resized])

  // Focus moves into the bubble when it opens, so keyboard users can answer it right away.
  useEffect(() => {
    if (autoFocus) ref.current?.querySelector<HTMLButtonElement>('button[data-primary]')?.focus({ preventScroll: true })
  }, [heading, text, autoFocus])

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label={typeof heading === 'string' ? heading : t('quest.mentorName')}
      className={`quest-bubble ${pos?.sheet ? 'is-sheet' : ''} ${portrait ? 'has-portrait' : ''}`}
      style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onClose) {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      {portrait && <div className="quest-bubble-portrait">{portrait}</div>}
      <div className="quest-bubble-body">
        <div className="quest-bubble-head">
          <span className="quest-bubble-title">{heading}</span>
          {step && step.total > 1 && (
            <span className="quest-bubble-dots" aria-label={t('quest.stepOf', { n: step.index + 1, total: step.total })}>
              {Array.from({ length: step.total }, (_, i) => (
                <span key={i} className={i === step.index ? 'is-current' : i < step.index ? 'is-done' : ''} />
              ))}
            </span>
          )}
          {onClose && (
            <button type="button" className="quest-bubble-close" onClick={onClose} aria-label={t('quest.close')} title={t('quest.close')}>
              ✕
            </button>
          )}
        </div>
        {/* The typed text is for the eye; screen readers get the whole sentence at once. */}
        <p className="quest-bubble-text" onClick={finish}>
          <span aria-hidden>{visible}</span>
          {rest && <span className="quest-bubble-caret" aria-hidden />}
          {/* The rest is laid out unseen, so the bubble keeps its size (and place) while typing. */}
          <span aria-hidden className="invisible">
            {rest}
          </span>
          <span className="sr-only" aria-live="polite">
            {text}
          </span>
        </p>
        {waiting && <p className="quest-bubble-waiting">{waiting}</p>}
        {footnote && <p className="quest-bubble-footnote">{footnote}</p>}
        {actions.length > 0 && (
          <div className="quest-bubble-actions">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                data-primary={a.primary || undefined}
                className={a.primary ? 'quest-btn is-primary' : 'quest-btn'}
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
