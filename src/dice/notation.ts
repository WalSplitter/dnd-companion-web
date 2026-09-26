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

/** A sum of dice groups and flat numbers, e.g. `4d12+1d12+10` or `2d20-1`. */
export interface DiceExpression {
  dice: { count: number; sides: number }[]
  modifier: number
}

const TERM_RE = /^([+-])(?:(\d*)[dw](\d+)|(\d+))$/i

/**
 * Parses a formula with any number of `+`/`−` separated terms (Nimble spells stack dice: a tier 4
 * spell upcast twice is `5d12+1d12+1d12`). Same dice conventions as `parseDiceNotation`. A
 * subtracted dice group isn't supported (no spell does that) and fails the parse.
 */
export function parseDiceExpression(raw: string): DiceExpression | undefined {
  const compact = raw.replace(/\s+/g, '').replace(/−/g, '-')
  if (!compact) return undefined
  const terms = (/^[+-]/.test(compact) ? compact : `+${compact}`).match(/[+-][^+-]+/g)
  if (!terms || terms.join('') !== (/^[+-]/.test(compact) ? compact : `+${compact}`)) return undefined

  const expression: DiceExpression = { dice: [], modifier: 0 }
  for (const term of terms) {
    const match = TERM_RE.exec(term)
    if (!match) return undefined
    const [, sign, countRaw, sidesRaw, flat] = match
    if (flat !== undefined) {
      expression.modifier += sign === '-' ? -Number(flat) : Number(flat)
      continue
    }
    if (sign === '-') return undefined
    const count = countRaw ? Number(countRaw) : 1
    const sides = Number(sidesRaw)
    const same = expression.dice.find((d) => d.sides === sides)
    if (same) same.count += count
    else expression.dice.push({ count, sides })
  }
  return expression
}

/** Back to a formula string: `5d12+10`, `1d10-1`, `3`. */
export function formatDiceExpression({ dice, modifier }: DiceExpression): string {
  const diceText = dice.map((d) => `${d.count}d${d.sides}`).join('+')
  if (!modifier) return diceText || '0'
  if (!diceText) return String(modifier)
  return `${diceText}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`
}

/** 2024-rules critical hit: doubles the number of damage dice rolled, not the flat modifier. */
export function rollDamage(raw: string, { critical = false }: { critical?: boolean } = {}): DiceRollResult | undefined {
  const parsed = parseDiceExpression(raw)
  if (!parsed || parsed.dice.length === 0) return undefined
  const rolls = parsed.dice.flatMap(({ count, sides }) => Array.from({ length: critical ? count * 2 : count }, () => rollOne(sides)))
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
