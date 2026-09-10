import type { SpellFrontmatter } from '../types'
import type { RawFile } from '../rawFile'
import { isRecord, linkDisplay } from './legacyCharacterSheet'

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

export function normalizeLegacySpellNote(raw: RawFile): SpellFrontmatter {
  const { data } = raw

  const classes = Array.isArray(data.Klassen) ? data.Klassen.map(linkDisplay).filter(Boolean) : undefined

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
  }
}
