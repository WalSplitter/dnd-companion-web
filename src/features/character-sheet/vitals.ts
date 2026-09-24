/** Exhaustion levels when the file doesn't say otherwise — the sixth one is death. */
export const DEFAULT_EXHAUSTION_MAX = 6

/** Clamps `value + delta` into `[min, max]`. */
export function stepWithin(value: number, delta: number, min: number, max = Infinity): number {
  return Math.max(min, Math.min(max, value + delta))
}
