import { looksLikeLegacyCharacter } from './adapters/legacyCharacterSheet'
import { parseRawFile } from './rawFile'
import type { VaultSourceFile } from './types'

export type RulesetId = 'dnd5e' | 'dnd5e_2024' | 'nimble' | 'custom' | 'unknown'

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

function hasTag(tags: unknown, needle: string): boolean {
  return Array.isArray(tags) && tags.some((t) => typeof t === 'string' && (t === needle || t.startsWith(`${needle}/`)))
}

/**
 * Best-effort, evidence-based heuristic — no supported vault format has an explicit `ruleset:`
 * marker. Treat the result as a hint, not a fact. In particular: a vault that mixes D&D-flavored
 * character fields with `Regeln/Nimble` tags is expected to come back as `'custom'` — that's the
 * DM's actual, deliberate design (see `docs/inventory-vault-alignment.md`), not an edge case to
 * special-case away.
 */
export function detectRuleset(files: VaultSourceFile[]): RulesetDetectionResult {
  const evidence: string[] = []
  let nimble = false
  let legacyDnd = false
  let nativeSchema = false

  for (const file of files) {
    if (!file.path.toLowerCase().endsWith('.md') || isDmPrivatePath(file.path)) continue
    const { data } = parseRawFile(file)

    if (!nimble && (hasTag(data.tags, 'Regeln/Nimble') || hasTag(data.tags, 'Nimble'))) {
      nimble = true
      evidence.push('tags: Regeln/Nimble')
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

  if (nimble && (legacyDnd || nativeSchema)) return { ruleset: 'custom', evidence }
  if (nimble) return { ruleset: 'nimble', evidence }
  if (nativeSchema) return { ruleset: 'dnd5e_2024', evidence }
  if (legacyDnd) return { ruleset: 'dnd5e', evidence }
  return { ruleset: 'unknown', evidence }
}
