import { NIMBLE_SKILL_ATTRIBUTES, SKILLS, type AbilityKey, type CharacterFrontmatter, type NimbleAttributeKey, type SkillKey } from '../vault/types'
import { abilityModifier, dndProficiencyBonus, isSavingThrowProficient, skillProficiencyLevel } from './dnd5e'
import { nimbleAttributeValue, nimbleSkillValue } from './endeavour'
import { abilityAbbreviation, exhaustionStaticPenalty, proficiencyBonus, spellcastingValue } from './deriveStats'
import { isEndeavour } from './ruleset'

/**
 * How a derived value comes about, term by term, for the tooltips that spell it out ("8 + IN +3 +
 * Übung +2 = 13"). Each function here mirrors one in `deriveStats.ts`/`dnd5e.ts`/`endeavour.ts`, and
 * its terms always add up to that function's result (`derivationTotal`), so a tooltip never
 * disagrees with the number beside it. Labels are left to the view (`derivationText`), only the
 * attribute's abbreviation is fixed here, since it depends on the ruleset.
 */
export type DerivationTerm =
  /** A fixed base, like the 8 of the spell save DC or the 10 of passive perception. */
  | { kind: 'constant'; value: number }
  /** An attribute (Nimble) or ability modifier (D&D), with its abbreviation (`ST`, `DEX`). */
  | { kind: 'attribute'; abbr: string; value: number }
  /** A Nimble skill's own trained value. */
  | { kind: 'skill'; value: number }
  | { kind: 'proficiency'; value: number }
  /** D&D expertise: twice the proficiency bonus. */
  | { kind: 'expertise'; value: number }
  /** The exhaustion penalty on values that stand in for a d20 test (`exhaustionStaticPenalty`), negative. */
  | { kind: 'exhaustion'; value: number }

export function derivationTotal(terms: DerivationTerm[]): number {
  return terms.reduce((sum, term) => sum + term.value, 0)
}

/** A Nimble attribute as a term. */
export function nimbleAttributeTerm(character: CharacterFrontmatter, attribute: NimbleAttributeKey): DerivationTerm {
  return { kind: 'attribute', abbr: attribute.toUpperCase(), value: nimbleAttributeValue(character, attribute) }
}

/** A D&D ability modifier as a term. */
function abilityTerm(character: CharacterFrontmatter, ability: AbilityKey): DerivationTerm {
  return { kind: 'attribute', abbr: abilityAbbreviation(character, ability), value: abilityModifier(character.abilities[ability]) }
}

/** `characterSkillBonus`: attribute + trained value in Endeavour, ability modifier + proficiency
 * (twice for expertise) in D&D. */
export function skillDerivation(character: CharacterFrontmatter, skill: SkillKey): DerivationTerm[] {
  if (isEndeavour(character)) {
    const trained = nimbleSkillValue(character, skill)
    const attribute = nimbleAttributeTerm(character, NIMBLE_SKILL_ATTRIBUTES[skill])
    return trained > 0 ? [attribute, { kind: 'skill', value: trained }] : [attribute]
  }
  const ability = SKILLS.find((s) => s.key === skill)?.ability
  if (!ability) throw new Error(`Unknown skill: ${skill}`)
  const level = skillProficiencyLevel(character, skill)
  const bonus = dndProficiencyBonus(character)
  const base = abilityTerm(character, ability)
  if (level === 'expertise') return [base, { kind: 'expertise', value: bonus * 2 }]
  if (level === 'proficient') return [base, { kind: 'proficiency', value: bonus }]
  return [base]
}

/** `savingThrowBonus` (D&D): ability modifier + proficiency when proficient. Nimble saves are the
 * attribute alone (`nimbleAttributeTerm`). */
export function dndSaveDerivation(character: CharacterFrontmatter, ability: AbilityKey): DerivationTerm[] {
  const base = abilityTerm(character, ability)
  return isSavingThrowProficient(character, ability) ? [base, { kind: 'proficiency', value: dndProficiencyBonus(character) }] : [base]
}

/** `initiativeBonus`: IN in Endeavour (the turn-order roll), the DEX modifier in D&D. */
export function initiativeDerivation(character: CharacterFrontmatter): DerivationTerm[] {
  return [isEndeavour(character) ? nimbleAttributeTerm(character, 'in') : abilityTerm(character, 'dex')]
}

/** The spellcasting attribute (+ proficiency in D&D), shared by attack and DC. Empty for non-casters. */
function spellcastingTerms(character: CharacterFrontmatter): DerivationTerm[] {
  const ability = character.spellcasting?.ability
  const value = spellcastingValue(character)
  if (!ability || value === undefined) return []
  const attribute: DerivationTerm = { kind: 'attribute', abbr: abilityAbbreviation(character, ability), value }
  const bonus = proficiencyBonus(character)
  return bonus ? [attribute, { kind: 'proficiency', value: bonus }] : [attribute]
}

/** The exhaustion term of a static value, when exhaustion lowers it. */
function exhaustionTerms(character: CharacterFrontmatter): DerivationTerm[] {
  const penalty = exhaustionStaticPenalty(character)
  return penalty > 0 ? [{ kind: 'exhaustion', value: -penalty }] : []
}

/** `spellAttackBonus`. Undefined for non-casters. */
export function spellAttackDerivation(character: CharacterFrontmatter): DerivationTerm[] | undefined {
  const terms = spellcastingTerms(character)
  return terms.length > 0 ? terms : undefined
}

/** `spellSaveDC`, exhaustion included. Undefined for non-casters. */
export function spellSaveDCDerivation(character: CharacterFrontmatter): DerivationTerm[] | undefined {
  const terms = spellcastingTerms(character)
  return terms.length > 0 ? [{ kind: 'constant', value: 8 }, ...terms, ...exhaustionTerms(character)] : undefined
}

/** `passivePerception`, exhaustion included. */
export function passivePerceptionDerivation(character: CharacterFrontmatter): DerivationTerm[] {
  return [{ kind: 'constant', value: 10 }, ...skillDerivation(character, 'perception'), ...exhaustionTerms(character)]
}
