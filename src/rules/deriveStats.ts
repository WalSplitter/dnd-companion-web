import { ABILITY_TO_NIMBLE_ATTRIBUTE, NIMBLE_SKILL_ATTRIBUTES, SKILLS, type AbilityKey, type CharacterFrontmatter, type NimbleAttributeKey, type SkillKey } from '../vault/types'

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function isSavingThrowProficient(character: CharacterFrontmatter, ability: AbilityKey): boolean {
  return character.saving_throw_proficiencies?.includes(ability) ?? false
}

/** D&D proficiency bonus, 0 when absent. Nimble has none at all (the DM dropped it in #9), so a
 * leftover `proficiency_bonus` on a Nimble sheet is ignored. */
export function proficiencyBonus(character: CharacterFrontmatter): number {
  return character.nimble_attributes ? 0 : (character.proficiency_bonus ?? 0)
}

export function savingThrowBonus(character: CharacterFrontmatter, ability: AbilityKey): number {
  const base = abilityModifier(character.abilities[ability])
  return isSavingThrowProficient(character, ability) ? base + proficiencyBonus(character) : base
}

export type SkillProficiencyLevel = 'none' | 'proficient' | 'expertise'

export function skillProficiencyLevel(character: CharacterFrontmatter, skill: SkillKey): SkillProficiencyLevel {
  if (character.skill_expertise?.includes(skill)) return 'expertise'
  if (character.skill_proficiencies?.includes(skill)) return 'proficient'
  return 'none'
}

export function skillBonus(character: CharacterFrontmatter, skill: SkillKey): number {
  const definition = SKILLS.find((s) => s.key === skill)
  if (!definition) throw new Error(`Unknown skill: ${skill}`)

  const base = abilityModifier(character.abilities[definition.ability])
  const level = skillProficiencyLevel(character, skill)
  if (level === 'expertise') return base + proficiencyBonus(character) * 2
  if (level === 'proficient') return base + proficiencyBonus(character)
  return base
}

/** Initiative modifier. Nimble characters roll initiative twice (see `nimbleInitiative`); this is
 * the turn-order roll there (IN), the DEX modifier in D&D. */
export function initiativeBonus(character: CharacterFrontmatter): number {
  return nimbleInitiative(character)?.order ?? abilityModifier(character.abilities.dex)
}

/**
 * Rule `Initiative`: every creature rolls twice at the start of combat. The Instinkt roll (`order`)
 * sets the turn order, the Beweglichkeit roll (`actions`) the action points in the first round
 * (see `initiativeActionPoints`). Undefined for characters without Nimble attributes.
 */
export function nimbleInitiative(character: CharacterFrontmatter): { order: number; actions: number } | undefined {
  if (!character.nimble_attributes) return undefined
  return { order: nimbleAttributeValue(character, 'in'), actions: nimbleAttributeValue(character, 'bw') }
}

/** Rule `Initiative#Beweglichkeitswurf`: 1-9 → 1 AP, 10-19 → 2 AP, 20+ (or a natural 20) → 3 AP. */
export function initiativeActionPoints(total: number, natural?: number): number {
  if (natural === 20 || total >= 20) return 3
  return total >= 10 ? 2 : 1
}

/** Passive Perception, already lowered by `exhaustionStaticPenalty`. Nimble characters use rule
 * `Wahrnehmung#Passive Wahrnehmung` (10 + IN + skill), D&D ones 10 + the perception skill bonus. */
export function passivePerception(character: CharacterFrontmatter): number {
  if (!character.nimble_attributes) return 10 + skillBonus(character, 'perception')
  return 10 + nimbleSkillBonus(character, 'perception') - exhaustionStaticPenalty(character)
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
 * save DC and passive checks: twice the level for Nimble characters (rule
 * `Erschöpfung#Beeinträchtigte W20-Prüfungen`, confirmed by the DM in #5), nothing in D&D, which
 * has no such rule. */
export function exhaustionStaticPenalty(character: CharacterFrontmatter): number {
  return character.nimble_attributes ? exhaustionD20Penalty(character) : 0
}

/** The spellcasting attribute's roll value: the Nimble attribute (KEY) on an Endeavour sheet, the
 * D&D ability modifier otherwise. Undefined for non-casters. */
export function spellcastingValue(character: CharacterFrontmatter): number | undefined {
  const ability = character.spellcasting?.ability
  if (!ability) return undefined
  return character.nimble_attributes
    ? nimbleAttributeValue(character, ABILITY_TO_NIMBLE_ATTRIBUTE[ability])
    : abilityModifier(character.abilities[ability])
}

/** Spell save DC: 8 + spellcasting value (+ proficiency bonus in D&D; Nimble has none, #9), already
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

/** Rule `Attribute#Maximaler Attributswert`: an attribute is always within -5..+5. */
export const NIMBLE_ATTRIBUTE_MIN = -5
export const NIMBLE_ATTRIBUTE_MAX = 5

/** Nimble attribute rolls are `W20 + Attributswert` directly — no score-to-modifier conversion.
 * Clamped to the rule's range so an out-of-range value on disk never leaks into saves/skills. */
export function nimbleAttributeValue(character: CharacterFrontmatter, attribute: NimbleAttributeKey): number {
  const value = character.nimble_attributes?.[attribute] ?? 0
  return Math.min(NIMBLE_ATTRIBUTE_MAX, Math.max(NIMBLE_ATTRIBUTE_MIN, value))
}

/** Rule `Fertigkeiten#Maximaler Fertigkeitsbonus`: a skill's own bonus is at most +10. */
export const NIMBLE_SKILL_MAX = 10

/** A Nimble skill's trained bonus (untrained = 0), clamped to 0..+10 so an out-of-range value on
 * disk never leaks into rolls. */
export function nimbleSkillValue(character: CharacterFrontmatter, skill: SkillKey): number {
  const value = character.nimble_skills?.[skill] ?? 0
  return Math.min(NIMBLE_SKILL_MAX, Math.max(0, value))
}

/** Nimble skill rolls add the independently-trained skill bonus on top of the governing
 * attribute's value (`W20 + Attributswert + Fertigkeitswert`) — unlike D&D, there's no shared
 * proficiency bonus multiplying up. */
export function nimbleSkillBonus(character: CharacterFrontmatter, skill: SkillKey): number {
  const attribute = NIMBLE_SKILL_ATTRIBUTES[skill]
  return nimbleAttributeValue(character, attribute) + nimbleSkillValue(character, skill)
}

/** A skill's total roll bonus under the character's rules: attribute + trained value on a Nimble
 * sheet, ability modifier + proficiency in D&D. */
export function characterSkillBonus(character: CharacterFrontmatter, skill: SkillKey): number {
  return character.nimble_attributes ? nimbleSkillBonus(character, skill) : skillBonus(character, skill)
}

/** Whether the character trained the skill: a Nimble skill value above 0, or D&D proficiency/expertise. */
export function isSkillTrained(character: CharacterFrontmatter, skill: SkillKey): boolean {
  return character.nimble_attributes ? nimbleSkillValue(character, skill) > 0 : skillProficiencyLevel(character, skill) !== 'none'
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

/** Base of the Nimble evasion value (`Ausweichwert`), before the BW bonus. */
export const EVASION_BASE = 10

/**
 * Nimble evasion value (`Regeln/Kampf/Angriff/Ausweichwert`): 10 + BW, where worn armor may cap the
 * BW part at its `BW_cap` (`bw_cap` on the sheet; no cap when absent). Undefined for characters
 * without Nimble attributes, since the value doesn't exist in D&D rules.
 */
export function evasionValue(character: CharacterFrontmatter): number | undefined {
  if (!character.nimble_attributes) return undefined
  const bw = nimbleAttributeValue(character, 'bw')
  return EVASION_BASE + (character.bw_cap === undefined ? bw : Math.min(bw, character.bw_cap))
}
