import { NIMBLE_SKILL_ATTRIBUTES, SKILLS, type AbilityKey, type CharacterFrontmatter, type NimbleAttributeKey, type SkillKey } from './types'

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function isSavingThrowProficient(character: CharacterFrontmatter, ability: AbilityKey): boolean {
  return character.saving_throw_proficiencies?.includes(ability) ?? false
}

export function savingThrowBonus(character: CharacterFrontmatter, ability: AbilityKey): number {
  const base = abilityModifier(character.abilities[ability])
  return isSavingThrowProficient(character, ability) ? base + character.proficiency_bonus : base
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
  if (level === 'expertise') return base + character.proficiency_bonus * 2
  if (level === 'proficient') return base + character.proficiency_bonus
  return base
}

export function initiativeBonus(character: CharacterFrontmatter): number {
  return abilityModifier(character.abilities.dex)
}

export function passivePerception(character: CharacterFrontmatter): number {
  return 10 + skillBonus(character, 'perception')
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

/** Spell save DC. Nimble characters also lose twice their exhaustion from it (rule
 * `Erschöpfung#Beeinträchtigte W20-Prüfungen`) — D&D has no such rule. */
export function spellSaveDC(character: CharacterFrontmatter): number | undefined {
  const ability = character.spellcasting?.ability
  if (!ability) return undefined
  const penalty = character.nimble_attributes ? exhaustionD20Penalty(character) : 0
  return 8 + character.proficiency_bonus + abilityModifier(character.abilities[ability]) - penalty
}

export function spellAttackBonus(character: CharacterFrontmatter): number | undefined {
  const ability = character.spellcasting?.ability
  if (!ability) return undefined
  return character.proficiency_bonus + abilityModifier(character.abilities[ability])
}

/** Feet per grid square on a standard battle map. */
export const FEET_PER_SQUARE = 5

/** Movement in grid squares: `30 ft` → 6. A value already counted in squares (`6 Felder`, the legacy
 * sheet's `Bewegung`) passes through; a bare number is read as feet. `undefined` if unparseable. */
export function speedInSquares(speed: string): number | undefined {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*([a-zäöüß]*)\.?\s*$/i.exec(speed)
  if (!match) return undefined
  const value = Number(match[1].replace(',', '.'))
  const unit = match[2].toLowerCase()
  if (['felder', 'feld', 'kästchen', 'squares', 'square'].includes(unit)) return value
  if (['', 'ft', 'feet', 'foot', 'fuß', 'fuss'].includes(unit)) return Math.floor(value / FEET_PER_SQUARE)
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

export function totalCharacterLevel(character: CharacterFrontmatter): number {
  return character.class.reduce((sum, c) => sum + c.level, 0)
}

export function classSummary(character: CharacterFrontmatter): string {
  return character.class
    .map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ''} ${c.level}`)
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
