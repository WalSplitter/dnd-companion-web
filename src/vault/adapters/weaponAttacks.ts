import { hasTag, tagList } from '../frontmatterFields'
import { findRawFileByName, type RawFile } from '../rawFile'
import type { CharacterFrontmatter, NimbleAttributeKey, WeaponAttack, WeaponKind } from '../types'
import { basename, linkFile } from '../wikilinkSyntax'
import { looksLikeEndeavourItem } from './endeavourItem'

/**
 * Weapon attacks of an Endeavour/Nimble character, read from the weapon notes under
 * `Gegenstände/Waffen/Waffen/` instead of being copied onto the character sheet. The character lists
 * `attacks: ["[[Kampfstab]]", "[[Dolch]]"]`; every other attack detail comes from the note, and the
 * bonus from the character's attributes (vault rules `Angriffswurf`, `Schadenswurf`, `Finesse`,
 * `Wurfwaffe`):
 * - melee and thrown attacks use ST, ranged weapons GE;
 * - `Finesse` lets ST or GE be used — the higher one is picked, for attack and damage alike;
 * - the damage bonus is the same attribute as the attack bonus.
 *
 * A note carries a melee profile (`Reichweite`/`Schaden`/`Schadensart`/`Eigenschaften`) and a ranged
 * one (`Range1-3`/`SchadenFern`/`SchadensartFern`/`EigenschaftenFern`); each filled-in profile becomes
 * its own attack, so a throwable dagger yields "Dolch" and "Dolch (Wurf)".
 *
 * An entry written out in full (an object with `name`, `damage_dice`, ...) is kept as-is, for attacks
 * without a note (claws, an improvised weapon). A link to a missing or non-weapon note is dropped.
 */

/** `"[[Hiebschaden]]/[[Stichschaden]]"` -> `"Hiebschaden/Stichschaden"` — every wikilink inside a
 * string replaced by its display text, not just a string that is one whole link. */
function linksToText(raw: unknown): string | undefined {
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined
  const text = String(raw)
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, alias?: string) => (alias ?? basename(target)).trim())
    .trim()
  return text || undefined
}

function propertyList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map(linksToText).filter((p): p is string => Boolean(p)) : []
}

/** `"1,5(1)"` (meters, then squares) -> `"1,5 m"`; the ranged `Range1-3` become `"3/6/12 m"`. */
function meters(parts: unknown[]): string | undefined {
  const values = parts.map((p) => linksToText(p)?.replace(/\s*\(\d+\)$/, '')).filter((p): p is string => Boolean(p))
  return values.length > 0 ? `${values.join('/')} m` : undefined
}

function attributeFor(kind: WeaponKind, finesse: boolean, character: CharacterFrontmatter): NimbleAttributeKey {
  const st = character.nimble_attributes?.st ?? 0
  const ge = character.nimble_attributes?.ge ?? 0
  if (kind === 'ranged') return 'ge'
  return finesse && ge > st ? 'ge' : 'st'
}

function weaponNoteAttacks(note: RawFile, name: string, character: CharacterFrontmatter): WeaponAttack[] {
  const { data } = note
  const tags = tagList(data)
  const meleeProperties = propertyList(data.Eigenschaften)
  const rangedProperties = propertyList(data.EigenschaftenFern)
  const finesse = [...meleeProperties, ...rangedProperties].includes('Finesse')
  const attacks: WeaponAttack[] = []

  const add = (kind: WeaponKind, label: string, dice: unknown, type: unknown, range: string | undefined, properties: string[]) => {
    const damageDice = linksToText(dice)
    if (!damageDice) return
    const attribute = attributeFor(kind, finesse, character)
    const bonus = character.nimble_attributes?.[attribute] ?? 0
    attacks.push({
      name: label,
      kind,
      attribute,
      attack_bonus: bonus,
      damage_dice: damageDice,
      damage_bonus: bonus,
      damage_type: linksToText(type),
      range: range ?? '',
      properties,
    })
  }

  add('melee', name, data.Schaden, data.Schadensart, meters([data.Reichweite]), meleeProperties)
  const thrown = hasTag(tags, 'Gegenstand/Waffe/Fernkampfwaffe/Wurfwaffe') || rangedProperties.includes('Wurfwaffe')
  const rangedLabel = attacks.length > 0 ? `${name} (${thrown ? 'Wurf' : 'Fernkampf'})` : name
  add(thrown ? 'thrown' : 'ranged', rangedLabel, data.SchadenFern, data.SchadensartFern, meters([data.Range1, data.Range2, data.Range3]), rangedProperties)
  return attacks
}

export function resolveWeaponAttacks(raw: unknown, character: CharacterFrontmatter, files: RawFile[]): WeaponAttack[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const attacks = raw.flatMap((entry): WeaponAttack[] => {
    // A stack of a stackable weapon (`{ link: "[[Wurfmesser]]", charges: 3 }`) attacks like its link.
    const stack = entry && typeof entry === 'object' && typeof (entry as { link?: unknown }).link === 'string' ? (entry as { link: string }).link : undefined
    if (typeof entry !== 'string' && stack === undefined) return entry && typeof entry === 'object' ? [entry as WeaponAttack] : []
    const name = linkFile(stack ?? entry)
    const note = character.nimble_attributes && name ? findRawFileByName(files, name) : undefined
    return note && looksLikeEndeavourItem(note.data) ? weaponNoteAttacks(note, name, character) : []
  })
  return attacks.length > 0 ? attacks : undefined
}
