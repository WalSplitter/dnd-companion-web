import { nimbleAttributeValue } from '../deriveStats'
import { isRecord, resolvePortraitLink } from '../frontmatterFields'
import { findRawFileByName, type RawFile } from '../rawFile'
import { NIMBLE_ATTRIBUTES, parseNimbleAttributeKey } from '../types'
import type { CharacterFrontmatter, CharacterWriteTargets, FieldWriteTarget, NimbleAttributeKey } from '../types'
import type { ImageAssets } from '../vaultLoader'
import { linkFile } from '../wikilinkSyntax'
import { looksLikeEndeavourItem, normalizeEndeavourItem } from './endeavourItem'

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
    } satisfies CharacterWriteTargets,
  }
}

/**
 * Primary attributes are fixed per class: a note named like the class (e.g. `Prüfling.md`) lists them
 * as `Primärattribute: [St, Ko]` (keys, abbreviations or full names). A multiclass character gets the
 * union of all its classes'. `undefined` when no class note declares any.
 */
function resolveClassPrimaryAttributes(classes: unknown, files: RawFile[]): NimbleAttributeKey[] | undefined {
  if (!Array.isArray(classes)) return undefined
  const names = new Set(classes.map((c) => (isRecord(c) && typeof c.name === 'string' ? c.name.trim().toLowerCase() : '')).filter(Boolean))
  const primary = new Set<NimbleAttributeKey>()
  for (const f of files) {
    if (!names.has(f.name.trim().toLowerCase()) || !Array.isArray(f.data.Primärattribute)) continue
    for (const raw of f.data.Primärattribute) {
      const key = parseNimbleAttributeKey(raw)
      if (key) primary.add(key)
    }
  }
  return primary.size > 0 ? NIMBLE_ATTRIBUTES.map(({ key }) => key).filter((key) => primary.has(key)) : undefined
}

/** The worn armor's wikilink: `armor:`, or `Rüstung:` as on the old sheet (`Verteidigung.Rüstung`). */
function armorLink(data: Record<string, unknown>): string | undefined {
  const raw = data.armor ?? data.Rüstung
  return typeof raw === 'string' && raw.trim() ? raw : undefined
}

/** "Max BW" (`BW_cap`) of the armor note the character links as worn (vault rule
 * `Ausweichwert#Rüstung und Max BW`). Undefined when no armor is worn, the note is missing or isn't armor, or it has no cap. */
function resolveArmorBwCap(link: string | undefined, files: RawFile[]): number | undefined {
  const file = link ? findRawFileByName(files, linkFile(link)) : undefined
  if (!file || !looksLikeEndeavourItem(file.data)) return undefined
  const item = normalizeEndeavourItem(file)
  return item.kind === 'armor' ? item.bw_cap : undefined
}

function numberFrom(files: RawFile[], noteName: string, field: string): number | undefined {
  const value = findRawFileByName(files, noteName)?.data[field]
  return typeof value === 'number' ? value : undefined
}

/**
 * Nimble has no hit dice: each level grants the class's `TP_pro_Stufe`/`RP_pro_Stufe` (declared on the
 * note named like the class, e.g. `Prüfling.md`), plus the subclass note's own value if it has one,
 * plus the attribute bonus — KO for TP (`Konstitution`), half EN rounded down for RP
 * (`Entschlossenheit`). Both rules also apply retroactively, so the max is always recomputed from
 * the current attributes. A pool stays undefined (the sheet's own `max` is kept) when any class note
 * lacks its per-level value.
 *
 * TODO: provisional until the DM ships class notes and further rule updates — revisit (1) the field
 * names/location `TP_pro_Stufe`/`RP_pro_Stufe` on class/subclass notes, (2) the subclass bonus counting
 * for every level of that class (even before the subclass is picked), (3) no per-level minimum.
 */
function resolveLevelPools(character: CharacterFrontmatter, files: RawFile[]): { hp?: number; resilience?: number } {
  if (!character.nimble_attributes || !Array.isArray(character.class) || character.class.length === 0) return {}
  const perLevelBonus = { hp: nimbleAttributeValue(character, 'ko'), resilience: Math.floor(nimbleAttributeValue(character, 'en') / 2) }

  const total = (pool: 'hp' | 'resilience', field: string): number | undefined => {
    let sum = 0
    for (const c of character.class) {
      const classValue = numberFrom(files, c.name, field)
      if (classValue === undefined || typeof c.level !== 'number') return undefined
      const subclassValue = c.subclass ? (numberFrom(files, c.subclass, field) ?? 0) : 0
      sum += c.level * (classValue + subclassValue + perLevelBonus[pool])
    }
    return Math.max(0, sum)
  }

  return { hp: total('hp', 'TP_pro_Stufe'), resilience: total('resilience', 'RP_pro_Stufe') }
}

/** Normalizes a `type: character` note (already validated to carry a `name`). */
export function normalizeNativeCharacter(raw: RawFile, files: RawFile[], imageAssets?: ImageAssets): CharacterFrontmatter {
  const character = raw.data as unknown as CharacterFrontmatter
  const linked = resolveLinkedFields(raw, files)
  const armor = armorLink(raw.data)
  const pools = resolveLevelPools(character, files)
  const writeTargets: CharacterWriteTargets = { ...ownFileWriteTargets(raw.path, raw.data), ...linked.writeTargets }

  return {
    ...character,
    ...linked.values,
    armor,
    // Always derived from the armor — a `bw_cap:` typed onto the sheet itself is ignored.
    bw_cap: resolveArmorBwCap(armor, files),
    hit_dice: character.nimble_attributes ? undefined : character.hit_dice,
    ...(pools.hp !== undefined && isRecord(raw.data.hp) ? { hp: { ...character.hp, max: pools.hp } } : {}),
    ...(pools.resilience !== undefined && character.resilience ? { resilience: { ...character.resilience, max: pools.resilience } } : {}),
    nimble_primary_attributes: resolveClassPrimaryAttributes(raw.data.class, files),
    portrait_url: resolvePortraitLink(raw.data.portrait, imageAssets),
    _write: Object.keys(writeTargets).length > 0 ? writeTargets : undefined,
  }
}
