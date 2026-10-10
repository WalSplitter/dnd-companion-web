import type { Vector2 } from '@owlbear-rodeo/sdk'
import type { LiveVitals } from './live'
import { BAND_RING_FILE, MAX_MEDALS, conditionMedalFile, conditionRingFile, exhaustionMedalFile, exhaustionRingFile, moreMedalFile } from './rings'
import type { TableEntry } from './table'

/** What a linked token shows: one ring over its rim, and its mana on the left. */
export interface MarkerContent {
  /** Mana left, 0…1 — absent for characters without a mana pool. */
  mana?: number
  /** The ring file (see `rings.ts`): the condition's own ring when there is one, a bare ring for several. */
  ring?: string
  /** On a bare ring, a medallion per condition (exhaustion first) — empty otherwise. */
  medals: string[]
}

/**
 * The markers of a character, undefined when there's nothing to show. A single condition (or
 * exhaustion alone) gets its full ring with name; several share one bare ring with a medallion
 * each, so they never stack into a tangle of rings.
 */
export function markerContent(live: LiveVitals | undefined, table: TableEntry | undefined): MarkerContent | undefined {
  const conditions = table?.conditions ?? []
  const exhaustion = live?.exhaustion ?? 0
  const count = conditions.length + (exhaustion > 0 ? 1 : 0)
  const content: MarkerContent = { medals: [] }
  if (count === 1) {
    content.ring = exhaustion > 0 ? exhaustionRingFile(exhaustion) : conditionRingFile(conditions[0])
  } else if (count > 1) {
    content.ring = BAND_RING_FILE
    const medals = [...(exhaustion > 0 ? [exhaustionMedalFile(exhaustion)] : []), ...conditions.map(conditionMedalFile)]
    content.medals = medals.length > MAX_MEDALS ? [...medals.slice(0, MAX_MEDALS - 1), moreMedalFile(medals.length - MAX_MEDALS + 1)] : medals
  }
  if (live?.mana !== undefined && live.manaMax) content.mana = Math.min(1, Math.max(0, live.mana / live.manaMax))
  return content.mana === undefined && !content.ring ? undefined : content
}

/** Degrees between neighbouring medallions on the rim. */
export const MEDAL_STEP = 31

/** Where `count` medallions sit on the rim, in degrees clockwise from the right: side by side over
 * the top, as Clash puts its HP bar over the lower half. */
export function medalAngles(count: number): number[] {
  return Array.from({ length: count }, (_, i) => 270 + (i - (count - 1) / 2) * MEDAL_STEP)
}

/** The mana arc on the left, in degrees clockwise from the right (y points down on the map). */
export const MANA_ARC = { from: 140, to: 220 } as const

/** Points along a circle of `radius` around the origin, from `from` to `to` degrees. */
export function arcPoints(radius: number, from: number, to: number): Vector2[] {
  const steps = Math.max(2, Math.ceil(Math.abs(to - from) / 4))
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = ((from + ((to - from) * i) / steps) * Math.PI) / 180
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
}
