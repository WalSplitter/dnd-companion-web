import type { CharacterFrontmatter } from '../../vault/types'

/** Where a character stands in the party lineup: front line, middle, or back line. */
export type FormationRank = 'front' | 'middle' | 'back'

export const FORMATION_RANKS: FormationRank[] = ['front', 'middle', 'back']

/**
 * Default rank per class, Endeavour (`Charaktere/Klassen/`) and D&D names alike: armored melee
 * classes hold the front, skirmishers and support casters the middle, full casters the back.
 */
const CLASS_RANKS: Record<string, FormationRank> = {
  // Endeavour
  krieger: 'front',
  berserker: 'front',
  paladin: 'front',
  taktiker: 'front',
  gauner: 'middle',
  mönch: 'middle',
  waldläufer: 'middle',
  kleriker: 'middle',
  arkanist: 'back',
  fluchwirker: 'back',
  naturalist: 'back',
  // D&D
  fighter: 'front',
  barbarian: 'front',
  rogue: 'middle',
  monk: 'middle',
  ranger: 'middle',
  cleric: 'middle',
  wizard: 'back',
  sorcerer: 'back',
  warlock: 'back',
  druid: 'back',
  bard: 'back',
  artificer: 'back',
}

/** `formation:` in a character's frontmatter wins over the class default — English or German values. */
const OVERRIDES: Record<string, FormationRank> = {
  front: 'front',
  vorne: 'front',
  middle: 'middle',
  mitte: 'middle',
  back: 'back',
  hinten: 'back',
}

export function formationOverride(character: CharacterFrontmatter): FormationRank | undefined {
  const value = character.formation
  return typeof value === 'string' ? OVERRIDES[value.trim().toLowerCase()] : undefined
}

/**
 * A character's lineup rank: the frontmatter override, else the default of their main class (the
 * one with the most levels), else back for anyone who casts and middle for everyone else.
 */
export function formationRank(character: CharacterFrontmatter): FormationRank {
  const override = formationOverride(character)
  if (override) return override
  const main = [...(character.class ?? [])].sort((a, b) => b.level - a.level)[0]
  const byClass = main ? CLASS_RANKS[main.name.trim().toLowerCase()] : undefined
  if (byClass) return byClass
  return character.spellcasting ? 'back' : 'middle'
}

/** The party split into ranks, front first, keeping each rank in vault order; empty ranks are dropped. */
export function formationRanks<T>(party: T[], characterOf: (entry: T) => CharacterFrontmatter): { rank: FormationRank; members: T[] }[] {
  return FORMATION_RANKS.map((rank) => ({ rank, members: party.filter((entry) => formationRank(characterOf(entry)) === rank) })).filter(
    (r) => r.members.length > 0,
  )
}

/** A member's footprint on the stage at full size. The viewer looks over the party's shoulders, so
 * the back line stands closest and is largest. Heights are for the tallest case (two-line name,
 * three bars plus the temp-HP/exhaustion line). */
export const RANK_FOOTPRINT: Record<FormationRank, { width: number; height: number }> = {
  front: { width: 158, height: 286 },
  middle: { width: 166, height: 302 },
  back: { width: 176, height: 318 },
}

export interface PlacedMember<T> {
  entry: T
  rank: FormationRank
  /** Centre of the member, from the stage's left edge. */
  x: number
  /** Top of the member, from the stage's top edge. */
  y: number
  width: number
  scale: number
  /** Painting order: lines nearer the viewer cover the ones behind. */
  depth: number
  /** Deterministic per-member phase for the idle animation, 0..1. */
  phase: number
}

const STAGE_PAD_X = 16
const STAGE_PAD_TOP = 28
/** Height of the band across the top of the stage where the enemy stands, facing the front line. */
export const ENEMY_BAND_HEIGHT = 132
const STAGE_PAD_BOTTOM = 16
const MIN_GAP_X = 12
const GAP_Y = 18
/** Members of one line stand this many footprints apart when there's room, leaving gaps the next
 * line can step into — that's what turns rows into a staggered formation. */
const SLOT_FACTOR = 2.4
/** How far two staggered lines may slide into each other, as a share of the upper line's height. */
const OVERLAP = 0.5
/** Below this stage width everyone is drawn smaller. */
const NARROW_STAGE = 560
const NARROW_SCALE = 0.8

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

interface Line<T> {
  rank: FormationRank
  members: T[]
  xs: number[]
  y: number
  width: number
  height: number
}

function collides<T>(a: Line<T>, b: Line<T>): boolean {
  const reach = (a.width + b.width) / 2 + MIN_GAP_X
  return a.xs.some((ax) => b.xs.some((bx) => Math.abs(ax - bx) < reach))
}

/**
 * Places the party on the formation stage, seen from behind: the front line at the top, below the
 * enemy band (`enemyBand` px tall) and facing it (furthest from the viewer, smallest), the back line at the bottom (closest, largest). Each line spreads its members wide and, where that avoids
 * a clash, shifts sideways into the gaps of the line before, so consecutive lines can slide halfway
 * into each other — a diamond for 1/2/1, a diagonal for two lone members. Lines that would still
 * overlap keep their full distance. A small per-character offset keeps it from looking gridded.
 */
export function layoutFormation<T>(
  ranks: { rank: FormationRank; members: T[] }[],
  stageWidth: number,
  seedOf: (entry: T) => string,
): { placed: PlacedMember<T>[]; height: number; enemyBand: number } {
  const scale = stageWidth < NARROW_STAGE ? NARROW_SCALE : 1
  const enemyBand = ENEMY_BAND_HEIGHT * scale
  const usable = Math.max(0, stageWidth - 2 * STAGE_PAD_X)
  const lines: Line<T>[] = []

  // Top of the stage first: front, middle, back.
  for (const { rank, members } of ranks) {
    const width = RANK_FOOTPRINT[rank].width * scale
    const height = RANK_FOOTPRINT[rank].height * scale
    const perLine = Math.max(1, Math.floor((usable + MIN_GAP_X) / (width + MIN_GAP_X)))
    for (let start = 0; start < members.length; start += perLine) {
      const chunk = members.slice(start, start + perLine)
      const slot = Math.min(width * SLOT_FACTOR, usable / chunk.length)
      const first = (stageWidth - slot * chunk.length) / 2 + slot / 2
      const centred = chunk.map((_, i) => first + i * slot)
      const line: Line<T> = { rank, members: chunk, xs: centred, y: enemyBand + STAGE_PAD_TOP, width, height }

      const previous = lines.at(-1)
      if (previous && collides(previous, line)) {
        // Step half a slot sideways (alternating direction) if that clears the line before and stays on stage.
        const direction = lines.length % 2 === 0 ? 1 : -1
        for (const shift of [direction * (slot / 2), -direction * (slot / 2)]) {
          const xs = centred.map((x) => x + shift)
          const onStage = xs.every((x) => x - width / 2 >= STAGE_PAD_X && x + width / 2 <= stageWidth - STAGE_PAD_X)
          if (onStage && !collides(previous, { ...line, xs })) {
            line.xs = xs
            break
          }
        }
      }

      for (const earlier of lines) {
        const below = collides(earlier, line) ? earlier.y + earlier.height + GAP_Y : earlier.y + earlier.height * OVERLAP
        line.y = Math.max(line.y, below)
      }
      lines.push(line)
    }
  }

  // Side steps can leave the group off-centre; centre its bounding box on the stage again.
  const left = Math.min(...lines.map((line) => Math.min(...line.xs) - line.width / 2))
  const right = Math.max(...lines.map((line) => Math.max(...line.xs) + line.width / 2))
  const recentre = stageWidth / 2 - (left + right) / 2

  const placed = lines.flatMap((line, depth) =>
    line.members.map((entry, i) => {
      const seed = hash(seedOf(entry))
      return {
        entry,
        rank: line.rank,
        // ±5 px sideways, ±6 px in depth: enough to look placed by hand, too little to eat the
        // minimum gap between two members.
        x: line.xs[i] + recentre + (seed - 0.5) * 10 * scale,
        y: line.y + (hash(`${seedOf(entry)}:y`) - 0.5) * 12 * scale,
        width: RANK_FOOTPRINT[line.rank].width,
        scale,
        depth,
        phase: seed,
      }
    }),
  )
  const height = lines.reduce((max, line) => Math.max(max, line.y + line.height), 0) + STAGE_PAD_BOTTOM
  return { placed, height, enemyBand }
}
