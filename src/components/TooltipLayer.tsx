import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Hover delay before a tooltip opens — long enough not to flicker while the pointer sweeps past. */
const OPEN_DELAY_MS = 280
/** Gap between the anchor and the tooltip (room for the arrow), and minimum viewport margin. */
const GAP = 10
const MARGIN = 8

interface Tip {
  text: string
  rect: DOMRect
}

interface Position {
  left: number
  top: number
  placement: 'top' | 'bottom'
  arrowX: number
}

/** Splits a hint into sentences: the first becomes the headline, the rest the body. */
function sentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-ZÄÖÜ(])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Numbers and modifiers (`+2`, `-1`, `10`) set in the numeric face, so formulas read at a glance. */
function withNumbers(line: string): ReactNode[] {
  return line.split(/([+−-]?\d+(?:[.,]\d+)?)/).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="app-tooltip-num">
        {part}
      </span>
    ) : (
      part
    ),
  )
}

/**
 * App-wide replacement for the browser's native `title` tooltip. Rather than every component opting
 * in, this listens once at the document level: when the pointer rests on (or keyboard focus reaches) an
 * element with a `title`, the attribute is parked in `data-tip` — so the native tooltip never shows —
 * and a themed tooltip is rendered in its place. Leaving restores the `title`, so components keep
 * treating it as a plain attribute. Touch input is left alone.
 */
export function TooltipLayer() {
  const id = useId()
  const [tip, setTip] = useState<Tip | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let anchor: HTMLElement | null = null
    let timer: number | undefined
    // React may re-set `title` while we hold the anchor (its text changed) — park it again, and
    // follow the new text.
    const observer = new MutationObserver(() => {
      const text = anchor?.getAttribute('title')
      if (!anchor || text === null || text === undefined) return
      anchor.dataset.tip = text
      anchor.removeAttribute('title')
      setTip((current) => (current ? { ...current, text } : current))
    })

    const release = () => {
      window.clearTimeout(timer)
      observer.disconnect()
      if (anchor) {
        const text = anchor.dataset.tip
        if (text !== undefined && !anchor.hasAttribute('title')) anchor.setAttribute('title', text)
        delete anchor.dataset.tip
        if (anchor.getAttribute('aria-describedby') === id) anchor.removeAttribute('aria-describedby')
      }
      anchor = null
      setTip(null)
    }

    const capture = (el: HTMLElement, delay: number) => {
      if (el === anchor) return
      release()
      const text = el.getAttribute('title')
      if (!text?.trim()) return
      anchor = el
      el.dataset.tip = text
      el.removeAttribute('title')
      observer.observe(el, { attributes: true, attributeFilter: ['title'] })
      timer = window.setTimeout(() => {
        if (anchor !== el || !el.isConnected) return
        if (!el.hasAttribute('aria-describedby')) el.setAttribute('aria-describedby', id)
        setTip({ text: el.dataset.tip ?? text, rect: el.getBoundingClientRect() })
      }, delay)
    }

    const titled = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>('[title]') : null)

    const onPointerOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      if (anchor?.contains(e.target as Node)) return
      const el = titled(e.target)
      if (el) capture(el, OPEN_DELAY_MS)
      else release()
    }
    const onPointerOut = (e: PointerEvent) => {
      if (anchor && !anchor.contains(e.relatedTarget as Node | null)) release()
    }
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof Element) || !target.matches(':focus-visible')) return
      const el = titled(target)
      if (el) capture(el, 0)
    }
    const onFocusOut = (e: FocusEvent) => {
      if (anchor && anchor.contains(e.target as Node) && !anchor.contains(e.relatedTarget as Node | null)) release()
    }
    // A click or scroll dismisses the tooltip but keeps the anchor parked, so the native tooltip
    // doesn't pop up in its place while the pointer is still resting there.
    const hide = () => {
      window.clearTimeout(timer)
      setTip(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }

    document.addEventListener('pointerover', onPointerOver)
    document.addEventListener('pointerout', onPointerOut)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('pointerdown', hide)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      release()
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('pointerout', onPointerOut)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('pointerdown', hide)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [id])

  // Measure, then place above the anchor (below when there's no room), clamped into the viewport.
  useLayoutEffect(() => {
    const el = ref.current
    if (!tip || !el) return setPosition(null)
    const { width, height } = el.getBoundingClientRect()
    const { rect } = tip
    const centerX = rect.left + rect.width / 2
    const placement = rect.top - GAP - height >= MARGIN ? 'top' : 'bottom'
    const left = Math.min(Math.max(centerX - width / 2, MARGIN), window.innerWidth - width - MARGIN)
    setPosition({
      left,
      top: placement === 'top' ? rect.top - GAP - height : rect.bottom + GAP,
      placement,
      arrowX: Math.min(Math.max(centerX - left, 14), width - 14),
    })
  }, [tip])

  if (!tip) return null
  const [head, ...rest] = sentences(tip.text)

  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className={`app-tooltip ${position ? `is-${position.placement}` : ''}`}
      style={position ? { left: position.left, top: position.top } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      <div className="app-tooltip-head">
        <span aria-hidden className="app-tooltip-gem" />
        <span>{withNumbers(head ?? '')}</span>
      </div>
      {rest.map((line, i) => (
        <p key={i} className="app-tooltip-line">
          {withNumbers(line)}
        </p>
      ))}
      <span aria-hidden className="app-tooltip-arrow" style={{ left: position?.arrowX ?? 0 }} />
    </div>,
    document.body,
  )
}
