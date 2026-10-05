import type { Vitals } from './live'

/**
 * The combat tracker "Clash!" (Battle-System) keeps each unit's stats in its token's metadata. The
 * format is not documented; these keys were read off a token in a real room. Clash stores the
 * current HP as a string and the rest as numbers. It has no resilience, so HP, temp HP, max HP and
 * armor class are exchanged.
 */
const NS = 'com.battle-system.clash/'
export const CLASH_KEYS = {
  /** `true` once the token was added to Clash. */
  member: `${NS}clash`,
  hp: `${NS}clash_currentHP`,
  hpMax: `${NS}clash_maxHP`,
  ac: `${NS}clash_armorClass`,
  /** Only on tokens once the GM turned on Clash's temp HP column; a string like the current HP. */
  temp: `${NS}clash_tempHP`,
  /** The name Clash lists the unit by — taken from the token when it joins Clash. */
  name: `${NS}clash_unitName`,
} as const

/** `temp` is absent while Clash doesn't track temp HP for the token. */
export type ClashVitals = Pick<Vitals, 'hp' | 'hpMax' | 'ac'> & { temp?: number }

/** Clash shows an empty field as `''`; that counts as 0 for temp HP. */
const toNumber = (value: unknown) => (value === '' || value === null ? 0 : Number(value))

/** The token's Clash values — undefined while it isn't in Clash, or holds values that aren't numbers. */
export function readClash(metadata: Record<string, unknown>): ClashVitals | undefined {
  if (metadata[CLASH_KEYS.member] !== true) return undefined
  const hp = Number(metadata[CLASH_KEYS.hp])
  const hpMax = Number(metadata[CLASH_KEYS.hpMax])
  const ac = Number(metadata[CLASH_KEYS.ac])
  if (!Number.isFinite(hp) || !Number.isFinite(hpMax) || !Number.isFinite(ac)) return undefined
  const temp = CLASH_KEYS.temp in metadata ? toNumber(metadata[CLASH_KEYS.temp]) : NaN
  return Number.isFinite(temp) ? { hp, hpMax, ac, temp } : { hp, hpMax, ac }
}

/** Whether Clash shows something else than `vitals` — temp HP only where Clash tracks them. */
export function clashDiffers(clash: ClashVitals, vitals: Pick<Vitals, 'hp' | 'hpMax' | 'ac' | 'temp'>): boolean {
  return clash.hp !== vitals.hp || clash.hpMax !== vitals.hpMax || clash.ac !== vitals.ac || (clash.temp !== undefined && clash.temp !== vitals.temp)
}

/** Keeps the type Clash used for a value (it stores some numbers as strings). */
const sameType = (previous: unknown, value: number) => (typeof previous === 'number' ? value : String(value))

/** Writes `vitals` into a token's metadata in Clash's shape. Temp HP only where Clash tracks them. */
export function writeClash(metadata: Record<string, unknown>, vitals: Pick<Vitals, 'hp' | 'hpMax' | 'ac' | 'temp'>): void {
  metadata[CLASH_KEYS.hp] = sameType(metadata[CLASH_KEYS.hp], vitals.hp)
  metadata[CLASH_KEYS.hpMax] = vitals.hpMax
  metadata[CLASH_KEYS.ac] = vitals.ac
  if (CLASH_KEYS.temp in metadata) metadata[CLASH_KEYS.temp] = sameType(metadata[CLASH_KEYS.temp], vitals.temp)
}

/** Renames a token in Clash, if it's there. */
export function renameInClash(metadata: Record<string, unknown>, name: string): void {
  if (CLASH_KEYS.name in metadata) metadata[CLASH_KEYS.name] = name
}
