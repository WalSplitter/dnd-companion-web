import { useEffect, useState } from 'react'

export interface TargetBox {
  top: number
  left: number
  width: number
  height: number
}

/** The element a tour step points at, by its `data-tour` anchor (the first visible one). */
export function findTourTarget(anchor: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`)) {
    if (el.getClientRects().length > 0) return el
  }
  return null
}

const same = (a: TargetBox | null, b: TargetBox | null) =>
  a === b ||
  (a !== null && b !== null && Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1)

/**
 * Follows where the anchor sits in the viewport, frame by frame while a step shows — the page may
 * still be loading, scroll, or reflow when a tab opens. Scrolls it into view once when it appears.
 * `null` while there is no such element (yet).
 */
export function useTourTarget(anchor: string | undefined): TargetBox | null {
  // The previous step's box stays for the frame until the new anchor is looked up, so the fog
  // glides from one target to the next instead of closing in between.
  const [box, setBox] = useState<TargetBox | null>(null)

  useEffect(() => {
    if (!anchor) return
    let frame = 0
    let scrolled = false
    let last: TargetBox | null = null
    let first = true
    const tick = () => {
      const el = findTourTarget(anchor)
      let next: TargetBox | null = null
      if (el) {
        if (!scrolled) {
          scrolled = true
          const r = el.getBoundingClientRect()
          const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-header-h')) || 0
          // On a phone the bubble docks to the bottom, so the target belongs in the top part of the screen.
          const phone = window.innerWidth < 640
          const visibleBottom = phone ? window.innerHeight * 0.5 : window.innerHeight - 8
          if (r.top < header + 8 || r.bottom > visibleBottom) {
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            // `scroll-margin-top` on the anchors keeps a target clear of the sticky header.
            el.scrollIntoView({ block: phone || r.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: reduce ? 'auto' : 'smooth' })
          }
        }
        const r = el.getBoundingClientRect()
        next = { top: r.top, left: r.left, width: r.width, height: r.height }
      }
      if (first || !same(last, next)) {
        first = false
        last = next
        setBox(next)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [anchor])

  return anchor ? box : null
}
