import { exhaustionLevel } from './deriveStats'
import type { CharacterFrontmatter } from '../vault/types'

/** Exhaustion levels when the file doesn't say otherwise — the sixth one is death. */
export const DEFAULT_EXHAUSTION_MAX = 6

/** Clamps `value + delta` into `[min, max]`. */
export function stepWithin(value: number, delta: number, min: number, max = Infinity): number {
  return Math.max(min, Math.min(max, value + delta))
}

/** `current` as a percentage of `max`, clamped to 0..100 (0 for an empty pool). */
export function percentOf(current: number, max: number): number {
  return max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
}

/** The resilience pool, only when both numbers are really there (hand-edited YAML may lack one). */
export function resiliencePool(character: CharacterFrontmatter): { current: number; max: number } | undefined {
  const pool = character.resilience
  return typeof pool?.current === 'number' && typeof pool.max === 'number' ? pool : undefined
}

export function maxExhaustion(character: CharacterFrontmatter): number {
  return character.conditions?.exhaustion_max ?? DEFAULT_EXHAUSTION_MAX
}

export type Fate = 'alive' | 'down' | 'dead'

/** Dead at the last exhaustion level (vault rule `Erschöpfung#Sterben`), down at 0 HP. */
export function characterFate(character: CharacterFrontmatter): Fate {
  if (exhaustionLevel(character) >= maxExhaustion(character)) return 'dead'
  return character.hp.current <= 0 ? 'down' : 'alive'
}
