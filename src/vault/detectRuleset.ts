import { looksLikeLegacyCharacter } from './adapters/legacyCharacterSheet'
import { hasTag, tagList } from './frontmatterFields'
import { parseRawFile } from './rawFile'
import type { VaultSourceFile } from './types'

export type RulesetId = 'dnd5e' | 'dnd5e_2024' | 'nimble' | 'endeavour' | 'custom' | 'unknown'

export interface RulesetDetectionResult {
  ruleset: RulesetId
  /** Raw, untranslated technical hints (tag/field names) backing the guess — for a tooltip. The UI
   * localizes the ruleset label itself via i18n, never this. */
  evidence: string[]
}

/** Any path segment starting with `_` (e.g. `zHidden/_Embeds/...`) is the DM's own private
 * scratch/notes, not part of the vault's real structure — excluded from detection so draft
 * experiments don't skew the guess. Same convention as Obsidian's own "excluded files" idea. */
function isDmPrivatePath(path: string): boolean {
  return path.split('/').some((segment) => segment.startsWith('_'))
}

/** The vault retagged its rules from `Regeln/Nimble` to `Regeln/Endeavour`; both still count. */
const ENDEAVOUR_TAG = 'Regeln/Endeavour'
const RULE_TAGS = [ENDEAVOUR_TAG, 'Regeln/Nimble', 'Nimble']

/**
 * Best-effort, evidence-based heuristic — no supported vault format has an explicit `ruleset:`
 * marker. Treat the result as a hint, not a fact. A `Regeln/Endeavour` tag names the DM's own ruleset
 * (Nimble mixed with D&D-flavored character fields, see `docs/inventory-vault-alignment.md`), so it
 * wins as `'endeavour'`. With only the older Nimble tags, that same mix still comes back as `'custom'`.
 */
export function detectRuleset(files: VaultSourceFile[]): RulesetDetectionResult {
  const evidence: string[] = []
  let nimble = false
  let endeavour = false
  let legacyDnd = false
  let nativeSchema = false

  for (const file of files) {
    if (!file.path.toLowerCase().endsWith('.md') || isDmPrivatePath(file.path)) continue
    const { data } = parseRawFile(file)

    const tags = tagList(data)
    const ruleTag = RULE_TAGS.find((tag) => hasTag(tags, tag))
    if (!nimble && ruleTag) {
      nimble = true
      evidence.push(`tags: ${ruleTag}`)
    }
    if (!endeavour && hasTag(tags, ENDEAVOUR_TAG)) {
      endeavour = true
      if (ruleTag !== ENDEAVOUR_TAG) evidence.push(`tags: ${ENDEAVOUR_TAG}`)
    }
    if (!nativeSchema && data.type === 'character') {
      nativeSchema = true
      evidence.push('type: character (own schema, modeled on 5e 2024 rules)')
    }
    if (!legacyDnd && looksLikeLegacyCharacter(data)) {
      legacyDnd = true
      evidence.push('Attribute/Rettungswürfe/Fertigkeiten fields')
    }
  }

  if (endeavour) return { ruleset: 'endeavour', evidence }
  if (nimble && (legacyDnd || nativeSchema)) return { ruleset: 'custom', evidence }
  if (nimble) return { ruleset: 'nimble', evidence }
  if (nativeSchema) return { ruleset: 'dnd5e_2024', evidence }
  if (legacyDnd) return { ruleset: 'dnd5e', evidence }
  return { ruleset: 'unknown', evidence }
}
