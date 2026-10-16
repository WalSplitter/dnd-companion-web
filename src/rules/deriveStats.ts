import { ABILITY_TO_NIMBLE_ATTRIBUTE, type AbilityKey, type CharacterFrontmatter, type SkillKey } from '../vault/types'
import { abilityModifier, dndProficiencyBonus, skillBonus, skillProficiencyLevel } from './dnd5e'
import { nimbleAttributeValue, nimbleInitiative, nimbleSkillBonus, nimbleSkillValue } from './endeavour'
import { isEndeavour } from './ruleset'

/**
 * Stats every sheet shows, whatever its rules: each function here picks the ruleset's own math from
 * `dnd5e.ts` or `endeavour.ts` via `isEndeavour`, so views don't branch on the ruleset for numbers.
 */

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

/** The proficiency bonus: the sheet's own in D&D, none at all in Endeavour (the DM dropped it in #9),
 * so a leftover `proficiency_bonus` on an Endeavour sheet is ignored. */
export function proficiencyBonus(character: CharacterFrontmatter): number {
  return isEndeavour(character) ? 0 : dndProficiencyBonus(character)
}

/** How an ability is abbreviated on this character's sheet: the D&D letters (`DEX`), or on an
 * Endeavour sheet the closest attribute (`BW`) — spellcasting and spell saves are still keyed by
 * `AbilityKey`, and a stray D&D letter would stand out on an otherwise all-Endeavour sheet. */
export function abilityAbbreviation(character: CharacterFrontmatter, ability: AbilityKey): string {
  return (isEndeavour(character) ? ABILITY_TO_NIMBLE_ATTRIBUTE[ability] : ability).toUpperCase()
}

/** Initiative modifier. Endeavour characters roll initiative twice (see `nimbleInitiative`); this is
 * the turn-order roll there (IN), the DEX modifier in D&D. */
export function initiativeBonus(character: CharacterFrontmatter): number {
  return nimbleInitiative(character)?.order ?? abilityModifier(character.abilities.dex)
}

/** A skill's total roll bonus under the character's rules: attribute + trained value in Endeavour,
 * ability modifier + proficiency in D&D. */
export function characterSkillBonus(character: CharacterFrontmatter, skill: SkillKey): number {
  return isEndeavour(character) ? nimbleSkillBonus(character, skill) : skillBonus(character, skill)
}

/** Whether the character trained the skill: an Endeavour skill value above 0, or D&D proficiency/expertise. */
export function isSkillTrained(character: CharacterFrontmatter, skill: SkillKey): boolean {
  return isEndeavour(character) ? nimbleSkillValue(character, skill) > 0 : skillProficiencyLevel(character, skill) !== 'none'
}

/** Passive Perception, already lowered by `exhaustionStaticPenalty`. Endeavour characters use rule
 * `Wahrnehmung#Passive Wahrnehmung` (10 + IN + skill), D&D ones 10 + the perception skill bonus. */
export function passivePerception(character: CharacterFrontmatter): number {
  return 10 + characterSkillBonus(character, 'perception') - exhaustionStaticPenalty(character)
}

/** Exhaustion levels (rule `Erschöpfung`), never negative. */
export function exhaustionLevel(character: CharacterFrontmatter): number {
  return Math.max(0, character.conditions?.exhaustion ?? 0)
}

/** Rule `Erschöpfung#Beeinträchtigte W20-Prüfungen`: every d20 test's result is reduced by twice
 * the exhaustion level. Applied when rolling (see `D20PenaltyProvider`), not baked into the bonuses
 * shown on the sheet. */
export function exhaustionD20Penalty(character: CharacterFrontmatter): number {
  return 2 * exhaustionLevel(character)
}

/** How much exhaustion lowers values that stand in for a d20 test without being rolled — the spell
 * save DC and passive checks: twice the level in Endeavour (rule
 * `Erschöpfung#Beeinträchtigte W20-Prüfungen`, confirmed by the DM in #5), nothing in D&D, which
 * has no such rule. */
export function exhaustionStaticPenalty(character: CharacterFrontmatter): number {
  return isEndeavour(character) ? exhaustionD20Penalty(character) : 0
}

/** The spellcasting attribute's roll value: the Nimble attribute (KEY) on an Endeavour sheet, the
 * D&D ability modifier otherwise. Undefined for non-casters. */
export function spellcastingValue(character: CharacterFrontmatter): number | undefined {
  const ability = character.spellcasting?.ability
  if (!ability) return undefined
  return isEndeavour(character)
    ? nimbleAttributeValue(character, ABILITY_TO_NIMBLE_ATTRIBUTE[ability])
    : abilityModifier(character.abilities[ability])
}

/** Spell save DC: 8 + spellcasting value (+ proficiency bonus in D&D; Endeavour has none, #9), already
 * lowered by `exhaustionStaticPenalty`. Deliberately unclamped: the DM ruled in #5 that it has no
 * minimum and may go negative — that is the caster's exhaustion at work. */
export function spellSaveDC(character: CharacterFrontmatter): number | undefined {
  const value = spellcastingValue(character)
  if (value === undefined) return undefined
  return 8 + proficiencyBonus(character) + value - exhaustionStaticPenalty(character)
}

/** Spell attack bonus: the spellcasting value (+ proficiency bonus in D&D). */
export function spellAttackBonus(character: CharacterFrontmatter): number | undefined {
  const value = spellcastingValue(character)
  return value === undefined ? undefined : proficiencyBonus(character) + value
}

/** Feet per grid square on a standard battle map. */
export const FEET_PER_SQUARE = 5
/** Metres per grid square (the Endeavour rules count movement in metres, 1.5 m per square). */
export const METERS_PER_SQUARE = 1.5

const SQUARE_UNITS = ['felder', 'feld', 'kästchen', 'squares', 'square']
const FEET_UNITS = ['', 'ft', 'feet', 'foot', 'fuß', 'fuss']
const METER_UNITS = ['m', 'meter', 'metern']

/** Movement in grid squares: `30 ft` → 6, `9 m` → 6. A value already counted in squares (`6 Felder`,
 * the legacy sheet's `Bewegung`) passes through; a bare number is read as feet. `undefined` if unparseable. */
export function speedInSquares(speed: string): number | undefined {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*([a-zäöüß]*)\.?\s*$/i.exec(speed)
  if (!match) return undefined
  const value = Number(match[1].replace(',', '.'))
  const unit = match[2].toLowerCase()
  if (SQUARE_UNITS.includes(unit)) return value
  if (FEET_UNITS.includes(unit)) return Math.floor(value / FEET_PER_SQUARE)
  // The epsilon keeps float noise from flooring an exact multiple (e.g. 7.5 / 1.5) one square short.
  if (METER_UNITS.includes(unit)) return Math.floor(value / METERS_PER_SQUARE + 1e-9)
  return undefined
}

/**
 * Movement in grid squares after exhaustion (rule `Erschöpfung#Verringerte Bewegungsrate`: −1.5 m
 * per level, and one square is 1.5 m / 5 ft, so −1 square per level), never below 0.
 */
export function movementSquares(character: CharacterFrontmatter): number | undefined {
  const squares = speedInSquares(character.speed)
  return squares === undefined ? undefined : Math.max(0, squares - exhaustionLevel(character))
}

export function totalCharacterLevel(character: CharacterFrontmatter): number {
  return character.class.reduce((sum, c) => sum + c.level, 0)
}

/** The character's class(es) for display. Per-class levels only appear when multiclassing
 * ("Arkanist 1 / Paladin 4"); a single class shows just its name, since its level is the
 * character's total level, which every view already shows beside it. */
export function classSummary(character: CharacterFrontmatter): string {
  const multiclass = character.class.length > 1
  return character.class
    .map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ''}${multiclass ? ` ${c.level}` : ''}`)
    .join(' / ')
}
