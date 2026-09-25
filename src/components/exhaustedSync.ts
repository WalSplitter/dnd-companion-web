import { useState, type CSSProperties } from 'react'

/** One shared cycle for every exhaustion animation (drip, ember glow, medallion heartbeat) — keep in
 * sync with the `animation-duration`s under `.exhausted-value` / `.rpg-medallion.is-exhausted` in
 * `index.css`. */
export const EXHAUSTED_CYCLE_MS = 4000

/**
 * Style that phase-locks an element's exhaustion animations to a global clock: a negative
 * `animation-delay` of "time since the last cycle boundary" makes an element that mounts mid-cycle
 * jump to the same point as everything already on screen. So every bleeding value drips and pulses
 * in unison — including ones that appear later (a tab switch, a newly raised exhaustion level).
 */
export function useExhaustedSync(): CSSProperties {
  const [delay] = useState(() => -(performance.now() % EXHAUSTED_CYCLE_MS))
  return { '--exhausted-sync': `${delay}ms` } as CSSProperties
}
