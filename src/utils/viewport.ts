/** Helpers for placing things in viewport pixels: floating panels, tours, popovers. */

/** Below this width the app treats the screen as a phone: panels dock to the bottom as sheets. */
export const PHONE_MAX_WIDTH = 640

/** `value` kept within `min`..`max`; `min` wins when the range is empty (a box wider than the screen). */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)))
}

/** Height of the sticky app header, as `App` publishes it in `--app-header-h`. */
export function headerHeight(fallback = 0): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-header-h')) || fallback
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A device whose pointer can't hover (touch screens): nothing there shows on hover. */
export function cannotHover(): boolean {
  return window.matchMedia('(hover: none)').matches
}
