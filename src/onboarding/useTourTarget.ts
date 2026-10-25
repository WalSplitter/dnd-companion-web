import { useEffect, useState } from 'react'
import { headerHeight, PHONE_MAX_WIDTH, prefersReducedMotion } from '../utils/viewport'

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

/** Brings a target that just appeared into view, unless it already is. */
function revealTarget(el: HTMLElement) {
  // The sticky header (theme switcher, quest log) is always on screen; scrolling wouldn't move it.
  if (el.closest('[data-app-header]')) return
  const r = el.getBoundingClientRect()
  // On a phone the bubble docks to the bottom, so the target belongs in the top part of the screen.
  const phone = window.innerWidth < PHONE_MAX_WIDTH
  const visibleBottom = phone ? window.innerHeight * 0.5 : window.innerHeight - 8
  if (r.top >= headerHeight() + 8 && r.bottom <= visibleBottom) return
  // `scroll-margin-top` on the anchors keeps a target clear of the sticky header.
  el.scrollIntoView({ block: phone || r.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

/**
 * Follows where the anchor sits in the viewport while a step shows. The target may not be rendered yet
 * (a page still loading, a tab about to open) or move (scrolling, reflow), so it is measured again —
 * at most once a frame — whenever the page scrolls, resizes or changes, and not at all while nothing
 * happens. Scrolls the target into view once when it appears. `null` while there is no such element.
 */
export function useTourTarget(anchor: string | undefined): TargetBox | null {
  // The previous step's box stays until the new anchor is measured, so the fog glides from one target
  // to the next instead of closing in between.
  const [box, setBox] = useState<TargetBox | null>(null)

  useEffect(() => {
    if (!anchor) return
    let el: HTMLElement | null = null
    let frame = 0
    let last: TargetBox | null = null
    let first = true
    const resized = new ResizeObserver(() => schedule())

    function measure() {
      frame = 0
      if (!el?.isConnected) {
        el = findTourTarget(anchor!)
        if (el) {
          revealTarget(el)
          resized.observe(el)
        }
      }
      const r = el?.getBoundingClientRect()
      const next = r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null
      if (first || !same(last, next)) {
        first = false
        last = next
        setBox(next)
      }
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    const mutations = new MutationObserver(schedule)
    mutations.observe(document.body, { childList: true, subtree: true })
    resized.observe(document.body)
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      mutations.disconnect()
      resized.disconnect()
      window.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
    }
  }, [anchor])

  return anchor ? box : null
}
