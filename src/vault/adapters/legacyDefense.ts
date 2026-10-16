import { abilityModifier } from '../../rules/dnd5e'
import { isRecord } from '../frontmatterFields'
import { findRawFileByName, type RawFile } from '../rawFile'
import type { AbilityKey } from '../types'
import { linkFile } from '../wikilinkSyntax'

/**
 * Armor class and damage reduction of a legacy "Character Sheet Vorlage" character, computed the way
 * that vault's own sheet embeds do (`embed Character Sheet Rüstung*`), on its D&D 2024 base plus the
 * DM's house rule: armor and shield notes carry `RP` (armor points, added to the AC), `SR`
 * (`Schadensreduktion`, flat damage reduction) and `Dex_cap` (armor only, caps the DEX modifier).
 *
 * The sheet has two revisions, both read here:
 * - the template's: `Rüstung:`/`Schild:` wikilinks at the top level;
 * - the later one: a `Verteidigung:` block with `Rüstung`, `Schild`, `Natürliche_Rüstung` (base, 10
 *   when absent), `Zusätzliche_Rüstung` and `Zusätzliche_SR` (bonuses typed in by hand).
 *
 * AC = base + DEX modifier (capped by the armor's `Dex_cap`) + armor `RP` + `Zusätzliche_Rüstung` +
 * shield `RP`, where without armor D&D's AC replacements apply instead: Mage Armor
 * (`InputData.MagierRüstung`, base 13) and Unarmored Defense (Barbarian + CON, Monk + WIS without a
 * shield). SR = armor `SR` + shield `SR` + `Zusätzliche_SR`.
 */

/** Classes whose Unarmored Defense adds a second ability to an unarmored AC (D&D 2024). */
const UNARMORED_DEFENSE: Record<string, { ability: AbilityKey; allowsShield: boolean }> = {
  barbar: { ability: 'con', allowsShield: true },
  mönch: { ability: 'wis', allowsShield: false },
}

const MAGE_ARMOR_BASE = 13
const DEFAULT_NATURAL_ARMOR = 10

export interface LegacyDefense {
  armorClass: number
  damageReduction?: number
  /** The worn armor and carried shield as written on the sheet, for display. */
  armor?: string
  shield?: string
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function link(value: unknown): string | undefined {
  return typeof value === 'string' && linkFile(value) ? value : undefined
}

/** `RP`/`SR`/`Dex_cap` of a linked armor or shield note; all absent when the note is missing. */
function gearStats(gearLink: string | undefined, files: RawFile[]): { rp?: number; sr?: number; dexCap?: number } {
  const note = gearLink ? findRawFileByName(files, linkFile(gearLink)) : undefined
  return note ? { rp: num(note.data.RP), sr: num(note.data.SR), dexCap: num(note.data.Dex_cap) } : {}
}

export function resolveLegacyDefense(
  data: Record<string, unknown>,
  abilities: Record<AbilityKey, number>,
  className: string,
  files: RawFile[],
): LegacyDefense {
  const block = isRecord(data.Verteidigung) ? data.Verteidigung : data
  const armor = link(block.Rüstung)
  const shield = link(block.Schild)
  const armorStats = gearStats(armor, files)
  const shieldStats = gearStats(shield, files)

  const dexMod = abilityModifier(abilities.dex)
  const natural = num(block.Natürliche_Rüstung) ?? DEFAULT_NATURAL_ARMOR
  const unarmored = UNARMORED_DEFENSE[className.trim().toLowerCase()]
  const mageArmor = isRecord(data.InputData) && data.InputData.MagierRüstung === true

  let base: number
  if (armor) base = natural + Math.min(dexMod, armorStats.dexCap ?? Infinity) + (armorStats.rp ?? 0)
  else if (mageArmor) base = MAGE_ARMOR_BASE + dexMod
  else if (unarmored && (unarmored.allowsShield || !shield)) base = natural + dexMod + abilityModifier(abilities[unarmored.ability])
  else base = natural + dexMod

  const damageReduction = (armorStats.sr ?? 0) + (shieldStats.sr ?? 0) + (num(block.Zusätzliche_SR) ?? 0)

  return {
    armorClass: base + (num(block.Zusätzliche_Rüstung) ?? 0) + (shieldStats.rp ?? 0),
    damageReduction: damageReduction > 0 ? damageReduction : undefined,
    armor,
    shield,
  }
}
