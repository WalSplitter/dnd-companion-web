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

/** Numbers and modifiers (`+2`, `-1`, `10`) set in the numeric face, so formulas read at a glance.
 * Dice notation (`W20`, `1d8`) is highlighted as a whole rather than split at the letter. */
function withNumbers(line: string): ReactNode[] {
  return line.split(/((?<![\p{L}\d])(?:[+−-]?\d*[WwDd]\d+|[+−-]?\d+(?:[.,]\d+)?)(?![\p{L}\d]))/u).map((part, i) =>
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
    // `anchor` is the innermost titled element under the pointer, whose tip is shown. `parked` is it
    // plus every titled ancestor: all of their titles are parked, since the browser would otherwise
    // fall back to the nearest ancestor's native tooltip.
    let anchor: HTMLElement | null = null
    let parked: HTMLElement[] = []
    let timer: number | undefined

    const park = (el: HTMLElement) => {
      const text = el.getAttribute('title')
      if (text === null) return
      el.dataset.tip = text
      el.removeAttribute('title')
    }
    // React may re-set a `title` while we hold it (its text changed) — park it again, and follow the
    // new text if it's the one on screen.
    const observer = new MutationObserver((mutations) => {
      for (const { target } of mutations) {
        if (!(target instanceof HTMLElement) || !target.hasAttribute('title')) continue
        park(target)
        if (target === anchor) setTip((current) => (current ? { ...current, text: target.dataset.tip ?? '' } : current))
      }
    })

    const release = () => {
      window.clearTimeout(timer)
      observer.disconnect()
      for (const el of parked) {
        const text = el.dataset.tip
        if (text !== undefined && !el.hasAttribute('title')) el.setAttribute('title', text)
        delete el.dataset.tip
        if (el.getAttribute('aria-describedby') === id) el.removeAttribute('aria-describedby')
      }
      parked = []
      anchor = null
      setTip(null)
    }

    /** Titled elements from `target` upward, innermost first — counting ones we already parked. An
     * empty `title` doesn't count, so an element can opt out and leave the tooltip to its container. */
    const titledChain = (target: EventTarget | null): HTMLElement[] => {
      const chain: HTMLElement[] = []
      for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
        if (el instanceof HTMLElement && (el.getAttribute('title') ?? el.dataset.tip)?.trim()) chain.push(el)
      }
      return chain
    }

    const show = (target: EventTarget | null, delay: number) => {
      const chain = titledChain(target)
      const inner = chain[0]
      if (inner === anchor) return
      release()
      if (!inner) return
      for (const el of chain) {
        park(el)
        observer.observe(el, { attributes: true, attributeFilter: ['title'] })
      }
      parked = chain
      anchor = inner
      timer = window.setTimeout(() => {
        if (anchor !== inner || !inner.isConnected) return
        if (!inner.hasAttribute('aria-describedby')) inner.setAttribute('aria-describedby', id)
        setTip({ text: inner.dataset.tip ?? '', rect: inner.getBoundingClientRect() })
      }, delay)
    }

    const onPointerOver = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') show(e.target, OPEN_DELAY_MS)
    }
    const onPointerOut = (e: PointerEvent) => {
      if (anchor && !anchor.contains(e.relatedTarget as Node | null)) release()
    }
    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.matches(':focus-visible')) show(e.target, 0)
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
