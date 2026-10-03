import type { CharacterFrontmatter } from '../vault/types'

/**
 * The live state of a session in Owlbear Rodeo. The vault on GitHub lags behind (edits are
 * committed in batches, and every browser only sees them after reloading), so while the group
 * plays, the values that change round by round live in the room, which Owlbear shares with
 * everyone at once:
 *
 * - the room's metadata holds one `LiveVitals` per character (the "roster"), keyed by name;
 * - a token on the map points at its character through its own metadata (`TokenLink`).
 *
 * The roster sits in the room rather than on the tokens, so it survives switching scenes.
 */
export const LIVE_KEY = 'dnd-companion/live'
export const LINK_KEY = 'dnd-companion/link'

/** The numbers a session changes, plus the ones a combat tracker shows next to them. */
export interface Vitals {
  hp: number
  hpMax: number
  temp: number
  /** Resilience points (Nimble/Endeavour) — absent for characters without the pool. */
  resilience?: number
  resilienceMax?: number
  ac: number
}

export interface LiveVitals extends Vitals {
  /** Owlbear connection that wrote this value last — a companion skips its own echoes. */
  by: string
  /** That player's name, shown next to the value. */
  byName: string
  at: number
}

export type LiveRoster = Record<string, LiveVitals>

export interface TokenLink {
  /** Name of the linked character, as in the vault (and its sheet's URL). */
  character: string
}

export function vitalsOf(character: CharacterFrontmatter): Vitals {
  const { hp, resilience } = character
  return {
    hp: hp.current,
    hpMax: hp.max,
    temp: hp.temp ?? 0,
    ...(resilience ? { resilience: resilience.current, resilienceMax: resilience.max } : {}),
    ac: character.armor_class,
  }
}

/** Whether the values a session changes — current HP, temp HP and resilience — are the same. */
export function samePools(a: Vitals, b: Vitals): boolean {
  return a.hp === b.hp && a.temp === b.temp && (a.resilience ?? null) === (b.resilience ?? null)
}

/** `character` showing the live pools from the room instead of the (possibly stale) vault values. */
export function withLiveVitals(character: CharacterFrontmatter, live: LiveVitals | undefined): CharacterFrontmatter {
  if (!live || samePools(vitalsOf(character), live)) return character
  return {
    ...character,
    hp: { ...character.hp, current: live.hp, temp: live.temp },
    ...(character.resilience && live.resilience !== undefined ? { resilience: { ...character.resilience, current: live.resilience } } : {}),
  }
}

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function isLiveVitals(value: unknown): value is LiveVitals {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return isNumber(v.hp) && isNumber(v.hpMax) && isNumber(v.temp) && isNumber(v.ac) && typeof v.by === 'string'
}

/** The roster out of the room's metadata, skipping entries in a shape this version doesn't know. */
export function readRoster(metadata: Record<string, unknown>): LiveRoster {
  const raw = metadata[LIVE_KEY]
  if (typeof raw !== 'object' || raw === null) return {}
  return Object.fromEntries(Object.entries(raw).filter(([, value]) => isLiveVitals(value))) as LiveRoster
}

export function readLink(metadata: Record<string, unknown>): TokenLink | undefined {
  const raw = metadata[LINK_KEY] as Partial<TokenLink> | undefined
  return typeof raw?.character === 'string' ? { character: raw.character } : undefined
}
