import { CHARACTER_RULESETS, type CharacterFrontmatter, type CharacterRuleset } from '../vault/types'

/**
 * The single place that decides which rules a character follows. Rules and UI branch on this —
 * never on whether some ruleset-specific field (`nimble_attributes`, `resilience`, `hit_dice`, ...)
 * happens to be present, so a stray field on a sheet can't flip a character into the other system.
 */
export function isEndeavour(character: Pick<CharacterFrontmatter, 'ruleset'>): boolean {
  return character.ruleset === 'endeavour'
}

/** A `ruleset:` value as written on a sheet, if it names one this app knows (case-insensitive). */
export function parseRuleset(value: unknown): CharacterRuleset | undefined {
  if (typeof value !== 'string') return undefined
  const needle = value.trim().toLowerCase()
  return CHARACTER_RULESETS.find((ruleset) => ruleset === needle)
}
