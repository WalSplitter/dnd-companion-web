export interface DiceNotation {
  count: number
  sides: number
  modifier: number
}

// Accepts the vault's own two dice-notation conventions: English "1d8"/"2d6+3" (used in
// weapon/spell damage fields) and German "1W6" (used for hit dice), count optional (defaults to 1).
const DICE_RE = /^(\d*)[dw](\d+)\s*([+-]\s*\d+)?$/i

export function parseDiceNotation(raw: string): DiceNotation | undefined {
  const match = DICE_RE.exec(raw.trim())
  if (!match) return undefined
  const [, countRaw, sidesRaw, modifierRaw] = match
  return {
    count: countRaw ? Number(countRaw) : 1,
    sides: Number(sidesRaw),
    modifier: modifierRaw ? Number(modifierRaw.replace(/\s+/g, '')) : 0,
  }
}

function rollOne(sides: number): number {
  return 1 + Math.floor(Math.random() * sides)
}

export interface DiceRollResult {
  notation: string
  rolls: number[]
  modifier: number
  total: number
}

export function rollDice(raw: string): DiceRollResult | undefined {
  const parsed = parseDiceNotation(raw)
  if (!parsed) return undefined
  const rolls = Array.from({ length: parsed.count }, () => rollOne(parsed.sides))
  return { notation: raw, rolls, modifier: parsed.modifier, total: rolls.reduce((sum, r) => sum + r, 0) + parsed.modifier }
}

/** 2024-rules critical hit: doubles the number of damage dice rolled, not the flat modifier. */
export function rollDamage(raw: string, { critical = false }: { critical?: boolean } = {}): DiceRollResult | undefined {
  const parsed = parseDiceNotation(raw)
  if (!parsed) return undefined
  const count = critical ? parsed.count * 2 : parsed.count
  const rolls = Array.from({ length: count }, () => rollOne(parsed.sides))
  return { notation: raw, rolls, modifier: parsed.modifier, total: rolls.reduce((sum, r) => sum + r, 0) + parsed.modifier }
}

export type RollMode = 'normal' | 'advantage' | 'disadvantage'

export interface D20RollResult {
  mode: RollMode
  rolls: number[]
  kept: number
  modifier: number
  total: number
  isCriticalHit: boolean
  isCriticalMiss: boolean
}

/** 2024-rules advantage/disadvantage: roll two d20s and keep the higher/lower — never reroll or
 * add a third die, regardless of how many sources of advantage/disadvantage apply. */
export function rollD20({ mode = 'normal', modifier = 0 }: { mode?: RollMode; modifier?: number }): D20RollResult {
  const rolls = mode === 'normal' ? [rollOne(20)] : [rollOne(20), rollOne(20)]
  const kept = mode === 'disadvantage' ? Math.min(...rolls) : Math.max(...rolls)
  return {
    mode,
    rolls,
    kept,
    modifier,
    total: kept + modifier,
    isCriticalHit: kept === 20,
    isCriticalMiss: kept === 1,
  }
}
