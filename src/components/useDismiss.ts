import { useEffect, useEffectEvent, type RefObject } from 'react'

/**
 * Closes a popover while it's `open`: on Escape, and on a pointer press outside it. "Inside" is any of
 * the given elements (the popover and its trigger), or whatever `inside` accepts.
 */
export function useDismiss(open: boolean, close: () => void, inside: readonly RefObject<Element | null>[] | ((target: Element) => boolean)) {
  const onDismiss = useEffectEvent(close)
  const isInside = useEffectEvent((target: Element) =>
    typeof inside === 'function' ? inside(target) : inside.some((ref) => ref.current?.contains(target)),
  )

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !isInside(e.target)) onDismiss()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])
}
