import { SKILLS, type AbilityKey, type CharacterFrontmatter, type SkillKey } from '../vault/types'

/**
 * D&D 5e 2024 math: six ability scores turned into modifiers, plus a proficiency bonus for trained
 * saves and skills (twice for expertise). Only meaningful for `ruleset: 'dnd5e'` characters — callers
 * that serve both rulesets go through `deriveStats.ts`.
 */

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** The sheet's proficiency bonus, 0 when absent. */
export function dndProficiencyBonus(character: CharacterFrontmatter): number {
  return character.proficiency_bonus ?? 0
}

export function isSavingThrowProficient(character: CharacterFrontmatter, ability: AbilityKey): boolean {
  return character.saving_throw_proficiencies?.includes(ability) ?? false
}

export function savingThrowBonus(character: CharacterFrontmatter, ability: AbilityKey): number {
  const base = abilityModifier(character.abilities[ability])
  return isSavingThrowProficient(character, ability) ? base + dndProficiencyBonus(character) : base
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
  if (level === 'expertise') return base + dndProficiencyBonus(character) * 2
  if (level === 'proficient') return base + dndProficiencyBonus(character)
  return base
}
