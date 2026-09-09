import { SKILLS, type AbilityKey, type CharacterFrontmatter, type SkillKey } from './types'

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

export function totalCharacterLevel(character: CharacterFrontmatter): number {
  return character.class.reduce((sum, c) => sum + c.level, 0)
}

export function classSummary(character: CharacterFrontmatter): string {
  return character.class
    .map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ''} ${c.level}`)
    .join(' / ')
}
