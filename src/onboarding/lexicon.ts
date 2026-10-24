import type { TranslationKey } from '../i18n/useI18n'
import { isEndeavour } from '../rules/ruleset'
import type { CharacterFrontmatter } from '../vault/types'

/**
 * The rules terms a newcomer stumbles over, each explained once per ruleset. A term only one
 * ruleset has (resilience, evasion, mana in Endeavour; proficiency in D&D) has only that entry, and
 * its rune only shows on sheets of that ruleset.
 */

export type LexiconRuleset = 'endeavour' | 'dnd5e'

export type LexiconTerm =
  | 'attribute'
  | 'savingThrow'
  | 'skill'
  | 'advantage'
  | 'initiative'
  | 'armorClass'
  | 'evasion'
  | 'hitPoints'
  | 'resilience'
  | 'exhaustion'
  | 'rest'
  | 'mana'
  | 'spellSlots'
  | 'proficiency'

export interface LexiconEntry {
  term: LexiconTerm
  icon: string
  title: TranslationKey
  body: Partial<Record<LexiconRuleset, TranslationKey>>
}

export const LEXICON: readonly LexiconEntry[] = [
  { term: 'attribute', icon: '💎', title: 'lexicon.attribute.title', body: { endeavour: 'lexicon.attribute.endeavour', dnd5e: 'lexicon.attribute.dnd5e' } },
  { term: 'savingThrow', icon: '🛡️', title: 'lexicon.savingThrow.title', body: { endeavour: 'lexicon.savingThrow.endeavour', dnd5e: 'lexicon.savingThrow.dnd5e' } },
  { term: 'skill', icon: '🧭', title: 'lexicon.skill.title', body: { endeavour: 'lexicon.skill.endeavour', dnd5e: 'lexicon.skill.dnd5e' } },
  { term: 'advantage', icon: '🍀', title: 'lexicon.advantage.title', body: { endeavour: 'lexicon.advantage.body', dnd5e: 'lexicon.advantage.body' } },
  { term: 'initiative', icon: '⚡', title: 'lexicon.initiative.title', body: { endeavour: 'lexicon.initiative.endeavour', dnd5e: 'lexicon.initiative.dnd5e' } },
  { term: 'armorClass', icon: '🛡️', title: 'lexicon.armorClass.title', body: { endeavour: 'lexicon.armorClass.endeavour', dnd5e: 'lexicon.armorClass.dnd5e' } },
  { term: 'evasion', icon: '💨', title: 'lexicon.evasion.title', body: { endeavour: 'lexicon.evasion.endeavour' } },
  { term: 'hitPoints', icon: '❤️', title: 'lexicon.hitPoints.title', body: { endeavour: 'lexicon.hitPoints.endeavour', dnd5e: 'lexicon.hitPoints.dnd5e' } },
  { term: 'resilience', icon: '🔥', title: 'lexicon.resilience.title', body: { endeavour: 'lexicon.resilience.endeavour' } },
  { term: 'exhaustion', icon: '🩸', title: 'lexicon.exhaustion.title', body: { endeavour: 'lexicon.exhaustion.endeavour', dnd5e: 'lexicon.exhaustion.dnd5e' } },
  { term: 'rest', icon: '🏕️', title: 'lexicon.rest.title', body: { endeavour: 'lexicon.rest.endeavour', dnd5e: 'lexicon.rest.dnd5e' } },
  { term: 'mana', icon: '🔷', title: 'lexicon.mana.title', body: { endeavour: 'lexicon.mana.endeavour' } },
  { term: 'spellSlots', icon: '🔮', title: 'lexicon.spellSlots.title', body: { dnd5e: 'lexicon.spellSlots.dnd5e' } },
  { term: 'proficiency', icon: '🎓', title: 'lexicon.proficiency.title', body: { dnd5e: 'lexicon.proficiency.dnd5e' } },
]

/** Which explanations a sheet gets. */
export function lexiconRuleset(character: Pick<CharacterFrontmatter, 'ruleset'>): LexiconRuleset {
  return isEndeavour(character) ? 'endeavour' : 'dnd5e'
}

export function lexiconEntry(term: LexiconTerm): LexiconEntry {
  return LEXICON.find((e) => e.term === term)!
}
