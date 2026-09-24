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

export function spellSaveDC(character: CharacterFrontmatter): number | undefined {
  const ability = character.spellcasting?.ability
  if (!ability) return undefined
  return 8 + character.proficiency_bonus + abilityModifier(character.abilities[ability])
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

/** Rule `Attribute#Maximaler Attributswert`: an attribute is always within -5..+5. */
export const NIMBLE_ATTRIBUTE_MIN = -5
export const NIMBLE_ATTRIBUTE_MAX = 5

/** Nimble attribute rolls are `W20 + Attributswert` directly — no score-to-modifier conversion.
 * Clamped to the rule's range so an out-of-range value on disk never leaks into saves/skills. */
export function nimbleAttributeValue(character: CharacterFrontmatter, attribute: NimbleAttributeKey): number {
  const value = character.nimble_attributes?.[attribute] ?? 0
  return Math.min(NIMBLE_ATTRIBUTE_MAX, Math.max(NIMBLE_ATTRIBUTE_MIN, value))
}

/** Nimble skill rolls add an independently-trained flat bonus (0-10, untrained = 0) on top of the
 * governing attribute's value — unlike D&D, there's no shared proficiency bonus multiplying up. */
export function nimbleSkillBonus(character: CharacterFrontmatter, skill: SkillKey): number {
  const attribute = NIMBLE_SKILL_ATTRIBUTES[skill]
  return nimbleAttributeValue(character, attribute) + (character.nimble_skills?.[skill] ?? 0)
}

export function totalCharacterLevel(character: CharacterFrontmatter): number {
  return character.class.reduce((sum, c) => sum + c.level, 0)
}

export function classSummary(character: CharacterFrontmatter): string {
  return character.class
    .map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ''} ${c.level}`)
    .join(' / ')
}
