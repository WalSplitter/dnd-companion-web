import { dieAtLevel, MARTIAL_ARTS } from '../../rules/endeavourClasses'
import { nimbleAttributeValue } from '../../rules/endeavour'
import { isEndeavour } from '../../rules/ruleset'
import { hasTag, tagList } from '../frontmatterFields'
import { findRawFileByName, type RawFile } from '../rawFile'
import { parseNimbleAttributeKey } from '../types'
import type { CharacterFrontmatter, NimbleAttributeKey, WeaponAttack, WeaponKind } from '../types'
import { linkFile, linksToText } from '../wikilinkSyntax'
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

/** A cell value as plain text (see `linksToText`); `undefined` when empty or not text. */
function cellText(raw: unknown): string | undefined {
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined
  const text = linksToText(String(raw)).trim()
  return text || undefined
}

function propertyList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map(cellText).filter((p): p is string => Boolean(p)) : []
}

/** `"1,5(1)"` (meters, then squares) -> `"1,5 m"`; the ranged `Range1-3` become `"3/6/12 m"`. */
function meters(parts: unknown[]): string | undefined {
  const values = parts.map((p) => cellText(p)?.replace(/\s*\(\d+\)$/, '')).filter((p): p is string => Boolean(p))
  return values.length > 0 ? `${values.join('/')} m` : undefined
}

function attributeFor(kind: WeaponKind, finesse: boolean, character: CharacterFrontmatter): NimbleAttributeKey {
  if (kind === 'ranged') return 'ge'
  return finesse && nimbleAttributeValue(character, 'ge') > nimbleAttributeValue(character, 'st') ? 'ge' : 'st'
}

function weaponNoteAttacks(note: RawFile, name: string, character: CharacterFrontmatter): WeaponAttack[] {
  const { data } = note
  const tags = tagList(data)
  const meleeProperties = propertyList(data.Eigenschaften)
  const rangedProperties = propertyList(data.EigenschaftenFern)
  const finesse = [...meleeProperties, ...rangedProperties].includes('Finesse')
  const attacks: WeaponAttack[] = []

  const add = (kind: WeaponKind, label: string, dice: unknown, type: unknown, range: string | undefined, properties: string[]) => {
    const damageDice = cellText(dice)
    if (!damageDice) return
    const attribute = attributeFor(kind, finesse, character)
    const bonus = nimbleAttributeValue(character, attribute)
    attacks.push({
      name: label,
      kind,
      attribute,
      attack_bonus: bonus,
      damage_dice: damageDice,
      damage_bonus: bonus,
      damage_type: cellText(type),
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

export const UNARMED_ATTACK = 'Waffenloser Angriff'

/** The character's entry for the martial-arts class (`MARTIAL_ARTS`), if it has the class. */
function martialArtsClass(character: CharacterFrontmatter) {
  return character.class?.find((c) => c.name?.toLowerCase() === MARTIAL_ARTS.className.toLowerCase())
}

/** The martial-arts die for the character's level in that class. */
function martialArtsDie(character: CharacterFrontmatter, files: RawFile[]): string | undefined {
  const entry = martialArtsClass(character)
  if (!entry || typeof entry.level !== 'number') return undefined
  return dieAtLevel(findRawFileByName(files, entry.name)?.data[MARTIAL_ARTS.dieField], entry.level)
}

/**
 * The attribute a monk strikes with (the DM, 2026-10-22): their subclass's `Kernattribut` (`Pfad der
 * Eisenfaust` → ST). Before choosing a subclass, or when its note names none, `Finesse` lets them
 * take the better of ST and GE.
 */
function martialArtsAttribute(character: CharacterFrontmatter, files: RawFile[]): NimbleAttributeKey {
  const subclass = martialArtsClass(character)?.subclass
  const core = subclass ? findRawFileByName(files, subclass)?.data.Kernattribut : undefined
  return parseNimbleAttributeKey(linkFile(core)) ?? attributeFor('melee', true, character)
}

/**
 * Rule `Waffenloser Angriff`: a melee attack with ST, dealing 1 + ST bludgeoning damage within 1,5 m.
 * A monk (note `Kampfkunst`) deals their Mönchswürfel instead, with the attribute of
 * `martialArtsAttribute`.
 */
function unarmedAttack(character: CharacterFrontmatter, files: RawFile[]): WeaponAttack {
  const die = martialArtsDie(character, files)
  const attribute = die ? martialArtsAttribute(character, files) : 'st'
  const bonus = nimbleAttributeValue(character, attribute)
  return {
    name: UNARMED_ATTACK,
    kind: 'melee',
    attribute,
    attack_bonus: bonus,
    damage_dice: die ?? '1',
    damage_bonus: bonus,
    damage_type: 'Wuchtschaden',
    range: '1,5 m',
    properties: die ? ['Finesse'] : [],
  }
}

/**
 * The character's attacks. A `"[[Waffenloser Angriff]]"` entry is the unarmed strike; a monk has it
 * without listing it, as their martial arts make it their main attack.
 */
export function resolveWeaponAttacks(raw: unknown, character: CharacterFrontmatter, files: RawFile[]): WeaponAttack[] | undefined {
  const entries = Array.isArray(raw) ? raw : []
  const isUnarmed = (entry: unknown) => typeof entry === 'string' && linkFile(entry).toLowerCase() === UNARMED_ATTACK.toLowerCase()
  const attacks = entries.flatMap((entry): WeaponAttack[] => {
    if (isEndeavour(character) && isUnarmed(entry)) return [unarmedAttack(character, files)]
    // A stack of a stackable weapon (`{ link: "[[Wurfmesser]]", charges: 3 }`) attacks like its link.
    const stack = entry && typeof entry === 'object' && typeof (entry as { link?: unknown }).link === 'string' ? (entry as { link: string }).link : undefined
    if (typeof entry !== 'string' && stack === undefined) return entry && typeof entry === 'object' ? [entry as WeaponAttack] : []
    const name = linkFile(stack ?? entry)
    const note = isEndeavour(character) && name ? findRawFileByName(files, name) : undefined
    return note && looksLikeEndeavourItem(note.data) ? weaponNoteAttacks(note, name, character) : []
  })
  if (isEndeavour(character) && !entries.some(isUnarmed) && martialArtsDie(character, files)) attacks.unshift(unarmedAttack(character, files))
  return attacks.length > 0 ? attacks : undefined
}
