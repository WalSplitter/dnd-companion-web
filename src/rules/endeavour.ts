import { NIMBLE_SKILL_ATTRIBUTES, type CharacterFrontmatter, type NimbleAttributeKey, type SkillKey } from '../vault/types'
import { isEndeavour } from './ruleset'

/**
 * Endeavour (Nimble-based) math: eight attributes used directly as roll modifiers, independently
 * trained skills, two initiative rolls and the evasion value. Only meaningful for
 * `ruleset: 'endeavour'` characters — callers that serve both rulesets go through `deriveStats.ts`.
 */

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

/**
 * Rule `Initiative`: every creature rolls twice at the start of combat. The Instinkt roll (`order`)
 * sets the turn order, the Beweglichkeit roll (`actions`) the action points in the first round
 * (see `initiativeActionPoints`). Undefined for D&D characters.
 */
export function nimbleInitiative(character: CharacterFrontmatter): { order: number; actions: number } | undefined {
  if (!isEndeavour(character)) return undefined
  return { order: nimbleAttributeValue(character, 'in'), actions: nimbleAttributeValue(character, 'bw') }
}

/** Rule `Initiative#Beweglichkeitswurf`: 1-9 → 1 AP, 10-19 → 2 AP, 20+ (or a natural 20) → 3 AP. */
export function initiativeActionPoints(total: number, natural?: number): number {
  if (natural === 20 || total >= 20) return 3
  return total >= 10 ? 2 : 1
}

/** Base of the Nimble evasion value (`Ausweichwert`), before the BW bonus. */
export const EVASION_BASE = 10

/**
 * Nimble evasion value (`Regeln/Kampf/Angriff/Ausweichwert`): 10 + BW, where worn armor may cap the
 * BW part at its `BW_cap` (`bw_cap` on the sheet; no cap when absent). Undefined for D&D characters,
 * since the value doesn't exist in D&D rules.
 */
export function evasionValue(character: CharacterFrontmatter): number | undefined {
  if (!isEndeavour(character)) return undefined
  const bw = nimbleAttributeValue(character, 'bw')
  return EVASION_BASE + (character.bw_cap === undefined ? bw : Math.min(bw, character.bw_cap))
}
