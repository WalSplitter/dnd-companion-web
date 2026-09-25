import type { SpellDamageScaling, SpellFrontmatter } from '../types'
import type { RawFile } from '../rawFile'
import { isRecord } from '../frontmatterFields'
import { linkDisplay, linkFile } from '../wikilinkSyntax'
import { ABILITY_MAP } from './legacyCharacterSheet'

/**
 * Adapter for individual spell notes in the same campaign vault as `legacyCharacterSheet.ts`
 * (German field names, no `type:` marker). Detected structurally: a numeric `Grad` (spell level)
 * alongside a `Schule` (school) field is specific enough to individual spell pages that it doesn't
 * collide with the vault's rule/overview pages (e.g. "Zaubergrad.md", "Zaubertypen/Buff.md"), which
 * describe the *concept* of spell level or spell types rather than being one.
 */
export function looksLikeLegacySpellNote(data: Record<string, unknown>): boolean {
  return typeof data.Grad === 'number' && (typeof data.Schule === 'string' || isRecord(data.Schule)) && 'Reichweite' in data
}

function components(data: Record<string, unknown>): string[] {
  const list: string[] = []
  if (data.Verbal === true) list.push('V')
  if (data.Geste === true) list.push('S')
  if (data.Material === true) list.push('M')
  return list
}

// Cantrip damage scaling, e.g. `SchadenLv5: 2d6` — the vault stores one flat field per breakpoint
// rather than a table, so the mapping from field name to character level is fixed (2024 rules use
// levels 5/11/17 for every scaling cantrip).
const DAMAGE_SCALING_FIELDS: { field: string; atLevel: number }[] = [
  { field: 'SchadenLv5', atLevel: 5 },
  { field: 'SchadenLv11', atLevel: 11 },
  { field: 'SchadenLv17', atLevel: 17 },
]

function damageScaling(data: Record<string, unknown>): SpellDamageScaling[] | undefined {
  const scaling = DAMAGE_SCALING_FIELDS.filter(({ field }) => typeof data[field] === 'string' && (data[field] as string).trim()).map(
    ({ field, atLevel }) => ({ at_level: atLevel, dice: (data[field] as string).trim() }),
  )
  return scaling.length > 0 ? scaling : undefined
}

export function normalizeLegacySpellNote(raw: RawFile): SpellFrontmatter {
  const { data } = raw

  const classes = Array.isArray(data.Klassen) ? data.Klassen.map(linkDisplay).filter(Boolean) : undefined
  const saveAbility = ABILITY_MAP[linkFile(data.Rettungswurf)]

  return {
    type: 'spell',
    name: raw.name,
    level: data.Grad as number,
    school: linkDisplay(data.Schule),
    casting_time: linkDisplay(data.Zeitaufwand),
    range: typeof data.Reichweite === 'string' ? data.Reichweite : linkDisplay(data.Reichweite),
    components: components(data),
    duration: typeof data.Dauer === 'string' ? data.Dauer : '',
    classes: classes && classes.length > 0 ? classes : undefined,
    damage: typeof data.Schaden === 'string' && data.Schaden.trim() ? data.Schaden.trim() : undefined,
    damage_scaling: damageScaling(data),
    damage_type: linkDisplay(data.Schadensart) || undefined,
    target: typeof data.Ziel === 'string' && data.Ziel.trim() ? data.Ziel.trim() : undefined,
    save_ability: saveAbility,
    concentration: data.Konzentration === true,
    ritual: data.Ritual === true,
    scalable: data.Skalierbar === true,
    spell_type: linkDisplay(data.Typ) || undefined,
  }
}
