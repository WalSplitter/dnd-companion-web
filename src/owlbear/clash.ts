import type { Vitals } from './live'

/**
 * The combat tracker "Clash!" (Battle-System) keeps each unit's stats in its token's metadata. The
 * format is not documented; these keys were read off a token in a real room. Clash stores the
 * current HP as a string and the rest as numbers. It has no temp HP or resilience, so only HP, max
 * HP and armor class are exchanged.
 */
const NS = 'com.battle-system.clash/'
export const CLASH_KEYS = {
  /** `true` once the token was added to Clash. */
  member: `${NS}clash`,
  hp: `${NS}clash_currentHP`,
  hpMax: `${NS}clash_maxHP`,
  ac: `${NS}clash_armorClass`,
} as const

export type ClashVitals = Pick<Vitals, 'hp' | 'hpMax' | 'ac'>

/** The token's Clash values — undefined while it isn't in Clash, or holds values that aren't numbers. */
export function readClash(metadata: Record<string, unknown>): ClashVitals | undefined {
  if (metadata[CLASH_KEYS.member] !== true) return undefined
  const hp = Number(metadata[CLASH_KEYS.hp])
  const hpMax = Number(metadata[CLASH_KEYS.hpMax])
  const ac = Number(metadata[CLASH_KEYS.ac])
  return Number.isFinite(hp) && Number.isFinite(hpMax) && Number.isFinite(ac) ? { hp, hpMax, ac } : undefined
}

export function clashDiffers(clash: ClashVitals, vitals: ClashVitals): boolean {
  return clash.hp !== vitals.hp || clash.hpMax !== vitals.hpMax || clash.ac !== vitals.ac
}

/** Writes `vitals` into a token's metadata in Clash's shape (current HP as the type Clash used). */
export function writeClash(metadata: Record<string, unknown>, vitals: ClashVitals): void {
  metadata[CLASH_KEYS.hp] = typeof metadata[CLASH_KEYS.hp] === 'number' ? vitals.hp : String(vitals.hp)
  metadata[CLASH_KEYS.hpMax] = vitals.hpMax
  metadata[CLASH_KEYS.ac] = vitals.ac
}
