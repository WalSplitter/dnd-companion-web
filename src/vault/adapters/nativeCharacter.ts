import { nimbleAttributeValue } from '../deriveStats'
import { isRecord, resolvePortraitLink } from '../frontmatterFields'
import { findRawFileByName, type RawFile } from '../rawFile'
import { NIMBLE_ATTRIBUTES, parseNimbleAttributeKey } from '../types'
import type { CharacterFeature, CharacterFrontmatter, CharacterWriteTargets, FeatureUsage, FieldWriteTarget, NimbleAttributeKey } from '../types'
import type { ImageAssets } from '../vaultLoader'
import { linkDisplay, linkFile } from '../wikilinkSyntax'
import { looksLikeEndeavourItem, normalizeEndeavourItem } from './endeavourItem'
import { resolveWeaponAttacks } from './weaponAttacks'

/**
 * The app's own `type: character` schema (see `types.ts`), including the additive "Endeavour"/Nimble
 * fields. `raw.data` is used as the schema as-is; this adapter only fills in what has to be looked up
 * elsewhere in the vault (linked sheets, class notes, worn armor, portrait) and records where each
 * editable field lives on disk.
 */

/** A frontmatter block and the file it was read from, so edits can be written back to the same place. */
interface Sourced {
  path: string
  record: Record<string, unknown>
}

/**
 * Write targets for fields that always live on the character's own file, at the same key names the
 * frontmatter already uses.
 */
function ownFileWriteTargets(path: string, data: Record<string, unknown>): CharacterWriteTargets {
  const targets: CharacterWriteTargets = {}

  if (isRecord(data.hp)) {
    targets.hp_current = { path, keyPath: ['hp', 'current'] }
    targets.hp_temp = { path, keyPath: ['hp', 'temp'], createIfMissing: true }
  }

  if (isRecord(data.resilience)) targets.resilience_current = { path, keyPath: ['resilience', 'current'] }

  // Exhaustion starts at 0 and is written on first use, creating `conditions:` if needed.
  targets.exhaustion = { path, keyPath: ['conditions', 'exhaustion'], createIfMissing: true }

  // Nimble has no hit dice (see `resolveLevelPools`), so a leftover `hit_dice:` block is ignored there.
  if (!isRecord(data.nimble_attributes) && isRecord(data.hit_dice) && typeof data.hit_dice.total === 'number') {
    // Own schema stores `used`, not remaining — the UI edits remaining, so this is written inverted.
    targets.hit_dice_remaining = { path, keyPath: ['hit_dice', 'used'], createIfMissing: true, encode: 'invert-from-max', max: data.hit_dice.total }
  }

  // Ability scores, Nimble attributes and skills are deliberately never writable: the DM sets them
  // in the vault, the web app only shows them.
  return targets
}

/** `spellcasting.slots.<grade>.used` on whichever file owns `spellcasting`. */
function spellSlotWriteTargets(source: Sourced | undefined): Record<string, FieldWriteTarget> | undefined {
  const slots = source && isRecord(source.record.slots) ? source.record.slots : undefined
  if (!source || !slots || Object.keys(slots).length === 0) return undefined
  return Object.fromEntries(
    Object.keys(slots).map((grade) => [grade, { path: source.path, keyPath: ['spellcasting', 'slots', grade, 'used'], createIfMissing: true }]),
  )
}

/** `spellcasting.mana.current` on whichever file owns `spellcasting`. */
function manaWriteTarget(source: Sourced | undefined): FieldWriteTarget | undefined {
  const mana = source && isRecord(source.record.mana) ? source.record.mana : undefined
  return source && mana && typeof mana.max === 'number' ? { path: source.path, keyPath: ['spellcasting', 'mana', 'current'], createIfMissing: true } : undefined
}

/**
 * Like the legacy vault's `Inventar <Name>.md` convention, a character's `endeavour_inventory`,
 * `currency`, `spellcasting` and `spells_known` may live on separate notes that link back via
 * `Charakter: "[[<character file name>]]"` (the Endeavour vault keeps `Inventar.md` and
 * `Spell Sheet.md` next to the character). A field set on the character's own file always wins, so
 * a linked sheet can't silently override an inline value; otherwise the first linked note carrying
 * it is used.
 */
function resolveLinkedFields(own: RawFile, files: RawFile[]) {
  const target = own.name.trim().toLowerCase()
  const candidates = [own, ...files.filter((f) => f !== own && linkFile(f.data.Charakter).toLowerCase() === target)]

  const blockSource = (key: string): Sourced | undefined => {
    const file = candidates.find((f) => isRecord(f.data[key]))
    return file ? { path: file.path, record: file.data[key] as Record<string, unknown> } : undefined
  }

  const inventory = blockSource('endeavour_inventory')
  const currency = blockSource('currency')
  const spellcasting = blockSource('spellcasting')
  const spellsKnown = candidates.find((f) => Array.isArray(f.data.spells_known))?.data.spells_known
  const spellSlots = spellSlotWriteTargets(spellcasting)
  const mana = manaWriteTarget(spellcasting)

  return {
    values: {
      endeavour_inventory: inventory?.record as CharacterFrontmatter['endeavour_inventory'],
      currency: currency?.record as CharacterFrontmatter['currency'],
      spellcasting: spellcasting?.record as unknown as CharacterFrontmatter['spellcasting'],
      spells_known: spellsKnown as CharacterFrontmatter['spells_known'],
    },
    writeTargets: {
      ...(inventory ? { endeavour_inventory: { path: inventory.path } } : {}),
      ...(currency ? { currency_block: { path: currency.path } } : {}),
      ...(spellSlots ? { spell_slots: spellSlots } : {}),
      ...(mana ? { mana_current: mana } : {}),
    } satisfies CharacterWriteTargets,
  }
}

/** The class notes (e.g. `Klassen/Arkanist/Arkanist.md`, tagged `Regeln/Endeavour/Charakter/Klasse`)
 * named like the character's classes, in the character's class order. */
function classNotes(classes: unknown, files: RawFile[]): RawFile[] {
  if (!Array.isArray(classes)) return []
  return classes.flatMap((c) => {
    const note = isRecord(c) && typeof c.name === 'string' ? findRawFileByName(files, c.name) : undefined
    return note ? [note] : []
  })
}

/**
 * Core attributes are fixed per class: the class note lists them as `Kernattribute: ["[[Stärke]]",
 * "[[Instinkt]]"]` (or the older `Primärattribute: [St, Ko]`; wikilinks, keys, abbreviations or full
 * names). A multiclass character gets the union of all its classes'. `undefined` when no class note
 * declares any.
 */
function resolveClassPrimaryAttributes(notes: RawFile[]): NimbleAttributeKey[] | undefined {
  const primary = new Set<NimbleAttributeKey>()
  for (const note of notes) {
    const list = note.data.Kernattribute ?? note.data.Primärattribute
    if (!Array.isArray(list)) continue
    for (const raw of list) {
      const key = parseNimbleAttributeKey(linkFile(raw))
      if (key) primary.add(key)
    }
  }
  return primary.size > 0 ? NIMBLE_ATTRIBUTES.map(({ key }) => key).filter((key) => primary.has(key)) : undefined
}

/** `"[[Verstandsrettungswürfe|VS-Rettungswürfe]]"` -> `vs`: the link target minus its "(s)rettungswürfe"
 * suffix, else the alias's `VS-` abbreviation. */
function parseSaveAttribute(raw: unknown): NimbleAttributeKey | undefined {
  const strip = (name: string) => name.replace(/-?rettungsw(ü|ue)rfe?$/i, '')
  const target = strip(linkFile(raw))
  return parseNimbleAttributeKey(target) ?? parseNimbleAttributeKey(target.replace(/s$/i, '')) ?? parseNimbleAttributeKey(strip(linkDisplay(raw)))
}

/**
 * Class saving throws (`Rettungswürfe: { Vorteil: [...], Nachteil: [...] }` on the class note) are
 * rolled with advantage/disadvantage. When a multiclass character gets both for the same save they
 * cancel out, like any other advantage/disadvantage pair. `undefined` when no class note declares any.
 */
function resolveClassSaveModes(notes: RawFile[]): CharacterFrontmatter['nimble_save_modes'] {
  const advantage = new Set<NimbleAttributeKey>()
  const disadvantage = new Set<NimbleAttributeKey>()
  for (const note of notes) {
    const saves = note.data.Rettungswürfe
    if (!isRecord(saves)) continue
    for (const [list, into] of [
      [saves.Vorteil, advantage],
      [saves.Nachteil, disadvantage],
    ] as const) {
      if (!Array.isArray(list)) continue
      for (const raw of list) {
        const key = parseSaveAttribute(raw)
        if (key) into.add(key)
      }
    }
  }
  const modes: NonNullable<CharacterFrontmatter['nimble_save_modes']> = {}
  for (const key of advantage) if (!disadvantage.has(key)) modes[key] = 'advantage'
  for (const key of disadvantage) if (!advantage.has(key)) modes[key] = 'disadvantage'
  return Object.keys(modes).length > 0 ? modes : undefined
}

/** Display names of the class notes' `Übung.Waffen`/`Übung.Rüstungen` links, merged across classes;
 * a literal `keine` ("none") is dropped. `undefined` when no class note declares any. */
function resolveClassProficiencies(notes: RawFile[]): CharacterFrontmatter['nimble_class_proficiencies'] {
  const collect = (field: 'Waffen' | 'Rüstungen') => {
    const names = new Set<string>()
    for (const note of notes) {
      const list = isRecord(note.data.Übung) ? note.data.Übung[field] : undefined
      if (!Array.isArray(list)) continue
      for (const raw of list) {
        const name = linkDisplay(raw)
        if (name && name.toLowerCase() !== 'keine') names.add(name)
      }
    }
    return [...names]
  }
  const weapons = collect('Waffen')
  const armor = collect('Rüstungen')
  return weapons.length > 0 || armor.length > 0 ? { weapons, armor } : undefined
}

/** The worn armor's wikilink: `armor:`, or `Rüstung:` as on the old sheet (`Verteidigung.Rüstung`). */
function armorLink(data: Record<string, unknown>): string | undefined {
  const raw = data.armor ?? data.Rüstung
  return typeof raw === 'string' && raw.trim() ? raw : undefined
}

/**
 * What the armor note the character links as worn contributes: its `RK` (rule `Rüstungsklasse`, the
 * flat damage reduction; 0 without armor — shields only add theirs reactively via `Blocken`) and its
 * "Max BW" `BW_cap` (rule `Ausweichwert#Rüstung und Max BW`, undefined = no cap). A missing note or
 * one that isn't armor counts as no armor.
 */
function resolveArmor(link: string | undefined, files: RawFile[]): { armorClass: number; bwCap?: number } {
  const file = link ? findRawFileByName(files, linkFile(link)) : undefined
  const item = file && looksLikeEndeavourItem(file.data) ? normalizeEndeavourItem(file) : undefined
  return item?.kind === 'armor' ? { armorClass: item.rk ?? 0, bwCap: item.bw_cap } : { armorClass: 0 }
}

/** `Einsatz` of a `#Merkmal` note: `[[Aktion]]`/`[[Bonusaktion]]` → action, `[[Reaktion]]` → reaction,
 * anything else (`Passiv`, absent) → passive — the same split as the vault's own sheet embeds. */
function parseFeatureUsage(raw: unknown): FeatureUsage {
  const name = linkFile(raw).trim().toLowerCase()
  if (name === 'aktion' || name === 'bonusaktion') return 'action'
  return name === 'reaktion' ? 'reaction' : 'passive'
}

/** A note's short description: its `Beschreibung` field, else the first prose paragraph of its body
 * (skipping headings, embeds and code blocks). */
function noteSummary(file: RawFile): string | undefined {
  if (typeof file.data.Beschreibung === 'string' && file.data.Beschreibung.trim()) return file.data.Beschreibung.trim()
  const paragraph = file.body
    .replace(/```[\s\S]*?```/g, '')
    .split(/\r?\n\s*\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .filter((line) => line.trim() && !/^\s*(#|!\[\[|---|>)/.test(line))
        .join(' ')
        .trim(),
    )
    .find(Boolean)
  return paragraph || undefined
}

/**
 * The character's features: `Merkmale:` (the vault's own sheet field) and/or `features:`. A
 * `"[[Dunkelsicht]]"` link is resolved against its note (name, `Einsatz`, description); a link to a
 * missing note is kept by name as a passive feature. Written-out entries pass through, their usage
 * read from `usage` or `Einsatz`.
 */
function resolveFeatures(data: Record<string, unknown>, files: RawFile[]): CharacterFeature[] | undefined {
  const entries = [data.Merkmale, data.features].flatMap((list) => (Array.isArray(list) ? list : []))
  const features = entries.flatMap((entry): CharacterFeature[] => {
    if (typeof entry === 'string' && entry.trim()) {
      const note = findRawFileByName(files, linkFile(entry))
      if (!note) return [{ name: linkDisplay(entry), usage: 'passive' }]
      return [{ name: linkDisplay(entry), description: noteSummary(note), usage: parseFeatureUsage(note.data.Einsatz) }]
    }
    if (!isRecord(entry) || typeof entry.name !== 'string') return []
    const usage = entry.usage === 'action' || entry.usage === 'reaction' ? entry.usage : parseFeatureUsage(entry.Einsatz)
    return [{ ...(entry as unknown as CharacterFeature), usage }]
  })
  return features.length > 0 ? features : undefined
}

function numberFrom(files: RawFile[], noteName: string, field: string): number | undefined {
  const value = findRawFileByName(files, noteName)?.data[field]
  return typeof value === 'number' ? value : undefined
}

/**
 * Nimble has no hit dice. Per the class notes (`embed Klasse`): at level 1 a class grants
 * `(BasisTP + KO) × 2` TP and every level up `BasisTP + KO`, i.e. `(level + 1) × (BasisTP + KO)` in
 * total; RP likewise with `BasisRP` and half EN rounded down (`Entschlossenheit`). Both rules also
 * apply retroactively, so the max is always recomputed from the current attributes. For a multiclass
 * character only the first listed (starting) class gets the doubled level 1. A subclass note's own
 * `BasisTP`/`BasisRP`, if it has one, adds to its class's per-level value. A pool stays undefined (the
 * sheet's own `max` is kept) when any class note lacks its base value.
 *
 * TODO: provisional until the DM ships subclass notes and multiclass rules — revisit (1) the subclass
 * bonus counting for every level of that class (even before the subclass is picked), (2) no per-level
 * minimum (a negative KO can make a level's gain negative; only the total is clamped at 0) and (3) the
 * doubled level 1 going to the first listed class only.
 */
function resolveLevelPools(character: CharacterFrontmatter, files: RawFile[]): { hp?: number; resilience?: number } {
  if (!character.nimble_attributes || !Array.isArray(character.class) || character.class.length === 0) return {}
  const perLevelBonus = { hp: nimbleAttributeValue(character, 'ko'), resilience: Math.floor(nimbleAttributeValue(character, 'en') / 2) }

  const total = (pool: 'hp' | 'resilience', field: string): number | undefined => {
    let sum = 0
    for (const [i, c] of character.class.entries()) {
      const classValue = numberFrom(files, c.name, field)
      if (classValue === undefined || typeof c.level !== 'number' || c.level < 1) return undefined
      const subclassValue = c.subclass ? (numberFrom(files, c.subclass, field) ?? 0) : 0
      const levels = i === 0 ? c.level + 1 : c.level
      sum += levels * (classValue + subclassValue + perLevelBonus[pool])
    }
    return Math.max(0, sum)
  }

  return { hp: total('hp', 'BasisTP'), resilience: total('resilience', 'BasisRP') }
}

/** Normalizes a `type: character` note (already validated to carry a `name`). */
export function normalizeNativeCharacter(raw: RawFile, files: RawFile[], imageAssets?: ImageAssets): CharacterFrontmatter {
  const character = raw.data as unknown as CharacterFrontmatter
  const linked = resolveLinkedFields(raw, files)
  const armor = armorLink(raw.data)
  const worn = resolveArmor(armor, files)
  const pools = resolveLevelPools(character, files)
  const notes = classNotes(raw.data.class, files)
  const writeTargets: CharacterWriteTargets = { ...ownFileWriteTargets(raw.path, raw.data), ...linked.writeTargets }

  return {
    ...character,
    ...linked.values,
    // Endeavour sheets may leave out the D&D `abilities` entirely (nothing Nimble reads them, #9);
    // neutral scores keep the D&D-only code paths safe.
    abilities: isRecord(raw.data.abilities) ? character.abilities : { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    armor,
    // Always derived from the armor — a `bw_cap:` typed onto the sheet itself is ignored, and so is
    // a Nimble sheet's own `armor_class` (a leftover D&D bridge value).
    bw_cap: worn.bwCap,
    armor_class: character.nimble_attributes ? worn.armorClass : character.armor_class,
    features: resolveFeatures(raw.data, files),
    hit_dice: character.nimble_attributes ? undefined : character.hit_dice,
    ...(pools.hp !== undefined && isRecord(raw.data.hp) ? { hp: { ...character.hp, max: pools.hp } } : {}),
    ...(pools.resilience !== undefined && character.resilience ? { resilience: { ...character.resilience, max: pools.resilience } } : {}),
    nimble_primary_attributes: resolveClassPrimaryAttributes(notes),
    nimble_save_modes: resolveClassSaveModes(notes),
    nimble_class_proficiencies: resolveClassProficiencies(notes),
    attacks: resolveWeaponAttacks(raw.data.attacks, character, files),
    portrait_url: resolvePortraitLink(raw.data.portrait, imageAssets),
    _write: Object.keys(writeTargets).length > 0 ? writeTargets : undefined,
  }
}
