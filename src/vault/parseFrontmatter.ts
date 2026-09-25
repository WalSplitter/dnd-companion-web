import { isRecord, linkFile, looksLikeLegacyCharacter, normalizeLegacyCharacter, resolvePortraitLink } from './adapters/legacyCharacterSheet'
import { looksLikeLegacySpellNote, normalizeLegacySpellNote } from './adapters/legacySpell'
import { looksLikeEndeavourItem, normalizeEndeavourItem } from './adapters/endeavourItem'
import { nimbleAttributeValue } from './deriveStats'
import { findRawFileByName, parseRawFile, type RawFile } from './rawFile'
import type { ImageAssets } from './vaultLoader'
import { NIMBLE_ATTRIBUTES, parseNimbleAttributeKey } from './types'
import type {
  CharacterFrontmatter,
  CharacterWriteTargets,
  FieldWriteTarget,
  NimbleAttributeKey,
  Vault,
  VaultFile,
  VaultFrontmatter,
  VaultSourceFile,
} from './types'

export class FrontmatterValidationError extends Error {
  readonly path: string

  constructor(path: string, reason: string) {
    super(`${path}: ${reason}`)
    this.name = 'FrontmatterValidationError'
    this.path = path
  }
}

function assertString(value: unknown, field: string, path: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new FrontmatterValidationError(path, `missing required string field "${field}"`)
  }
}

/** Parses a single vault source file into typed frontmatter + markdown body, or `null` if it has no recognized `type`. */
export function parseVaultFile(file: VaultSourceFile): VaultFile<VaultFrontmatter> | null {
  const { data, body } = parseRawFile(file)
  const type = data.type as string | undefined
  if (type !== 'character' && type !== 'item' && type !== 'spell') return null

  assertString(data.name, 'name', file.path)

  return {
    path: file.path,
    frontmatter: data as unknown as VaultFrontmatter,
    body,
  }
}

/**
 * Write targets for the app's own `type: character` schema — trivial compared to the legacy
 * adapter's (`legacyCharacterSheet.ts`): everything always lives on the character's own file, at
 * the same key names the frontmatter already uses, since `raw.data` is used as the schema as-is.
 */
function ownSchemaWriteTargets(path: string, data: Record<string, unknown>): CharacterWriteTargets | undefined {
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

  const slots = isRecord(data.spellcasting) && isRecord(data.spellcasting.slots) ? data.spellcasting.slots : undefined
  if (slots) {
    const spellSlots: Record<string, FieldWriteTarget> = {}
    for (const grade of Object.keys(slots)) spellSlots[grade] = { path, keyPath: ['spellcasting', 'slots', grade, 'used'], createIfMissing: true }
    targets.spell_slots = spellSlots
  }

  return Object.keys(targets).length > 0 ? targets : undefined
}

// Files under a path containing "vorlage" (German for "template") are the vault's blank
// character-sheet templates, not real characters — skip them even though they structurally
// match the legacy character format.
function isTemplateFile(raw: RawFile): boolean {
  return /vorlage/i.test(raw.path)
}

/**
 * The app's own `type: character` schema keeps everything on one file by default (see
 * `ownSchemaWriteTargets`'s comment) — but, like the legacy vault's `Inventar <Name>.md`/
 * `Spell Sheet <Name>.md` convention (`legacyCharacterSheet.ts`'s `findLinkedSheet`/
 * `findSpellSource`), a character's `endeavour_inventory`/`currency` and/or
 * `spellcasting`/`spells_known` can instead live on a separate note backlinked via a
 * `Charakter: "[[<character file name>]]"` field. Whichever of these fields isn't already set
 * directly on the character's own file is filled in from the first backlinked note that carries it; a
 * field already present on the character's own file always wins (so a linked sheet can't silently
 * override an inline value).
 */
function resolveLinkedCharacterExtensions(ownPath: string, characterFileName: string, data: Record<string, unknown>, files: RawFile[]) {
  const target = characterFileName.trim().toLowerCase()
  const linked = files.filter((f) => linkFile(f.data.Charakter).toLowerCase() === target)

  const endeavourInventoryPath = isRecord(data.endeavour_inventory) ? ownPath : linked.find((f) => isRecord(f.data.endeavour_inventory))?.path

  return {
    endeavour_inventory: data.endeavour_inventory ?? linked.find((f) => isRecord(f.data.endeavour_inventory))?.data.endeavour_inventory,
    /** Which file actually owns the `endeavour_inventory` key — the character's own file when it
     * carries the field inline, otherwise the first linked note that does. Feeds
     * `CharacterWriteTargets.endeavour_inventory` (see `buildVault`) so edits from the slot-grid
     * inventory UI know which file to patch. `undefined` when neither has the field yet. */
    endeavour_inventory_path: endeavourInventoryPath,
    currency: data.currency ?? linked.find((f) => isRecord(f.data.currency))?.data.currency,
    /** Which file owns the `currency` key — same own-file-wins rule as the value itself. */
    currency_source: isRecord(data.currency)
      ? { path: ownPath, record: data.currency }
      : (() => {
          const f = linked.find((l) => isRecord(l.data.currency))
          return f ? { path: f.path, record: f.data.currency as Record<string, unknown> } : undefined
        })(),
    spellcasting: data.spellcasting ?? linked.find((f) => isRecord(f.data.spellcasting))?.data.spellcasting,
    spells_known: data.spells_known ?? linked.find((f) => Array.isArray(f.data.spells_known))?.data.spells_known,
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

/** `BW_cap` of the armor note the character links as worn (vault rule `Ausweichwert#Rüstung und
 * BW_cap`). Undefined when no armor is worn, the note is missing or isn't armor, or it has no cap. */
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

/**
 * Parses all source files and buckets them by type. Two frontmatter conventions are recognized:
 *  - the app's own `type: character|item|spell` marker (see `types.ts`)
 *  - an existing campaign vault's schema with no `type:` marker — characters and spell notes are
 *    detected structurally and normalized by `adapters/legacyCharacterSheet.ts` / `adapters/legacySpell.ts`
 * Files matching neither, and not the experimental `Gegenstand/...`-tagged "Endeavour" item shape
 * (see `adapters/endeavourItem.ts`, collected into `vault.endeavourItems`), are kept as plain notes.
 * The legacy vault's own item notes fall into this last bucket: their schema varies too much per
 * category — weapon/armor/food/... — for a single structural adapter to be worthwhile yet, so items
 * only show up as the inline `InlineItem` entries a character's inventory table already carries, not
 * as browsable `vault.items` entries.
 */
export function buildVault(files: VaultSourceFile[], imageAssets?: ImageAssets): Vault {
  const vault: Vault = { characters: [], items: [], spells: [], notes: [], endeavourItems: [] }
  const rawFiles = files.filter((f) => f.path.toLowerCase().endsWith('.md')).map(parseRawFile)

  for (const raw of rawFiles) {
    const type = raw.data.type as string | undefined

    if (type === 'character' || type === 'item' || type === 'spell') {
      assertString(raw.data.name, 'name', raw.path)
      const parsed: VaultFile<VaultFrontmatter> = {
        path: raw.path,
        frontmatter: raw.data as unknown as VaultFrontmatter,
        body: raw.body,
      }
      if (type === 'character') {
        const character = parsed.frontmatter as CharacterFrontmatter
        const { endeavour_inventory_path, currency_source, ...linkedExtensions } = resolveLinkedCharacterExtensions(
          raw.path,
          raw.name,
          raw.data,
          rawFiles,
        )
        const writeTargets = {
          ...ownSchemaWriteTargets(raw.path, raw.data),
          ...(currency_source ? { currency_block: { path: currency_source.path } } : {}),
        }
        const armor = armorLink(raw.data)
        const pools = resolveLevelPools(character, rawFiles)
        vault.characters.push({
          ...parsed,
          frontmatter: {
            ...character,
            ...linkedExtensions,
            armor,
            // Always derived from the armor — a `bw_cap:` typed onto the sheet itself is ignored.
            bw_cap: resolveArmorBwCap(armor, rawFiles),
            hit_dice: character.nimble_attributes ? undefined : character.hit_dice,
            ...(pools.hp !== undefined && isRecord(raw.data.hp) ? { hp: { ...character.hp, max: pools.hp } } : {}),
            ...(pools.resilience !== undefined && character.resilience
              ? { resilience: { ...character.resilience, max: pools.resilience } }
              : {}),
            nimble_primary_attributes: resolveClassPrimaryAttributes(raw.data.class, rawFiles),
            portrait_url: resolvePortraitLink(raw.data.portrait, imageAssets),
            _write: (() => {
              const merged = { ...writeTargets, ...(endeavour_inventory_path ? { endeavour_inventory: { path: endeavour_inventory_path } } : {}) }
              return Object.keys(merged).length > 0 ? merged : undefined
            })(),
          },
        } as VaultFile<Extract<VaultFrontmatter, { type: 'character' }>>)
      } else if (type === 'item') vault.items.push(parsed as VaultFile<Extract<VaultFrontmatter, { type: 'item' }>>)
      else vault.spells.push(parsed as VaultFile<Extract<VaultFrontmatter, { type: 'spell' }>>)
    } else if (!isTemplateFile(raw) && looksLikeLegacyCharacter(raw.data)) {
      vault.characters.push({ path: raw.path, frontmatter: normalizeLegacyCharacter(raw, rawFiles, imageAssets), body: raw.body })
    } else if (looksLikeLegacySpellNote(raw.data)) {
      // Kept raw (not pre-flattened to plain text) — the UI renders every spell/item body through
      // `renderObsidianBody` (`renderObsidian.tsx`) uniformly, which strips Obsidian-only syntax while
      // preserving line breaks and turning wikilinks into clickable links.
      vault.spells.push({ path: raw.path, frontmatter: normalizeLegacySpellNote(raw), body: raw.body })
    } else if (looksLikeEndeavourItem(raw.data)) {
      // Experimental — see `adapters/endeavourItem.ts`'s doc comment for why this is a separate
      // collection rather than folded into `vault.items`.
      vault.endeavourItems.push({ path: raw.path, frontmatter: normalizeEndeavourItem(raw), body: raw.body })
    } else {
      // Everything else (rule pages, class/feature lore, weapon/item stat blocks the legacy vault's
      // varying schemas aren't worth a dedicated adapter for yet, ...) is kept as a plain note so any
      // `[[Wikilink]]` pointing at it can still resolve to something in the UI (see wikilinks.ts).
      vault.notes.push({ path: raw.path, name: raw.name, body: raw.body })
    }
  }

  return vault
}
