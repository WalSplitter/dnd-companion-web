import type { TranslateFn } from '../../i18n/useI18n'
import type { RawFile } from '../rawFile'
import { hasTag, tagList } from '../frontmatterFields'
import { linkDisplay } from '../wikilinkSyntax'
import type {
  EndeavourItemBase,
  EndeavourItemSize,
  EndeavourWeightClass,
  EndeavourWeaponKind,
  EndeavourWeaponForm,
  EndeavourWearSlot,
  EndeavourItemFrontmatter,
} from '../endeavourItemTypes'

/**
 * Adapter for the "Endeavour" campaign vault's item notes
 * (`01 - Spielerbereich/Gegenstände/` — the DM's real, canonical item database, ~175 notes across
 * Ausrüstung/Behälter/Rüstung/Waffen/Nahrungsmittel as of this writing). `container`/`equipment`/
 * `weapon` kinds below are confirmed against those real notes; `armor`/`shield` are partially
 * confirmed (RK/Stärke/BW_cap/Kosten match, but see `stealth_disadvantage`'s and `EndeavourItemBase`'s (`endeavourItemTypes.ts`)
 * doc comments for fields that turned out different from the original guess); `magic_item`/`tool`
 * remain unconfirmed — no real note of either kind exists yet.
 *
 * Known gap: `Gegenstand/Nahrungsmittel/...` (food/drink, e.g. `Gegenstände/Nahrungsmittel/Speisen/
 * Laib Brot.md`) isn't a recognized kind here yet — it falls through to the `tool` catch-all below,
 * which is wrong, just not yet load-bearing for anything the app does with items.
 *
 * A real weapon note carries *both* a melee stat block (`Reichweite`/`Schaden`/`Schadensart`/
 * `Eigenschaften`) and a ranged one (`Range1-3`/`SchadenFern`/`SchadensartFern`/`EigenschaftenFern`) on
 * the same file — whichever doesn't apply is just left blank, and a dual-purpose weapon (e.g. a
 * throwable spear) has both filled in. This adapter picks one primary `weapon_kind` per item (melee >
 * thrown > ranged) and only surfaces that profile's fields, the same simplification
 * `legacyCharacterSheet.ts`'s `resolveWeaponAttacks()` already makes for the older vault's identical
 * tag/field scheme.
 *
 * Wired into `buildVault()` (`parseFrontmatter.ts`), but deliberately into its own
 * `Vault.endeavourItems` collection rather than the native `Vault.items` — the tag scheme this
 * detects (`Gegenstand/Waffe/...`) is the same one the *existing* legacy vault's weapon/armor notes
 * already carry (see `legacyCharacterSheet.ts`'s `resolveWeaponAttacks`), so folding these into
 * `vault.items` would also change behavior for a vault this app already supports (its own
 * weapon/armor notes would start showing up there too) — a decision to make deliberately, not a side
 * effect of this adapter.
 */

// Re-exported so the adapter stays the one place callers import item types and helpers from.
export type {
  EndeavourItemSize,
  EndeavourWeightClass,
  EndeavourWeaponKind,
  EndeavourWeaponForm,
  EndeavourWearSlot,
  EndeavourWeaponItem,
  EndeavourArmorItem,
  EndeavourShieldItem,
  EndeavourMagicItem,
  EndeavourToolItem,
  EndeavourEquipmentItem,
  EndeavourContainerItem,
  EndeavourItemFrontmatter,
} from '../endeavourItemTypes'

/**
 * Structural detection by tag, mirroring `looksLikeLegacyCharacter`/`looksLikeLegacySpellNote`'s
 * style. Matches the taxonomy found in the new vault's Supercharged Links config + Dataview queries:
 * `Gegenstand`, `Gegenstand/Waffe`, `Gegenstand/Rüstung`, `Gegenstand/Schild`,
 * `Gegenstand/Magischer_Gegenstand`, and the inconsistently-named tool tag (`Gegenstand/Werkzeug` in
 * Dataview queries, bare `Werkzeug` in the icon config — both accepted here).
 */
export function looksLikeEndeavourItem(data: Record<string, unknown>): boolean {
  const tags = tagList(data)
  return hasTag(tags, 'Gegenstand') || hasTag(tags, 'Werkzeug')
}

/** Priority order (melee > thrown > ranged) matters: a dual-purpose weapon (e.g. a throwable spear)
 * carries both a `Nahkampfwaffe` and a `Fernkampfwaffe/Wurfwaffe` tag at once — see the module doc
 * comment for why only one profile is surfaced. */
function endeavourWeaponKind(tags: string[]): EndeavourWeaponKind | undefined {
  if (hasTag(tags, 'Gegenstand/Waffe/Nahkampfwaffe')) return 'melee'
  if (hasTag(tags, 'Gegenstand/Waffe/Fernkampfwaffe/Wurfwaffe')) return 'thrown'
  if (hasTag(tags, 'Gegenstand/Waffe/Fernkampfwaffe')) return 'ranged'
  return undefined
}

/** `Gegenstand/Waffe/<Form>` tags naming a weapon's shape, and words in a weapon's name that do the
 * same for notes without one (e.g. `Kampfstab`). Crossbow before bow: an "Armbrust" is no "Bogen". */
const WEAPON_FORM_TAGS: [EndeavourWeaponForm, string[]][] = [
  ['sword', ['Schwert']],
  ['dagger', ['Messer']],
  ['axe', ['Axt']],
  ['mace', ['Hammer', 'Keule', 'Flegel']],
  ['staff', ['Stab']],
  ['polearm', ['Stangenwaffe']],
  ['crossbow', ['Armbrust']],
  ['bow', ['Bogen']],
]
const WEAPON_FORM_NAMES: [EndeavourWeaponForm, string[]][] = [
  ['crossbow', ['armbrust', 'crossbow']],
  ['bow', ['bogen', 'bow']],
  ['staff', ['stab', 'staff', 'stock']],
  ['axe', ['axt', 'beil', 'axe']],
  ['dagger', ['dolch', 'messer', 'dagger', 'knife']],
  ['polearm', ['speer', 'pike', 'hellebarde', 'glefe', 'lanze', 'dreizack', 'spear', 'halberd', 'glaive']],
  ['mace', ['hammer', 'kolben', 'keule', 'knüppel', 'flegel', 'mace', 'club', 'flail']],
  ['sword', ['schwert', 'säbel', 'rapier', 'falchion', 'klinge', 'sword', 'saber', 'blade']],
]

function weaponFormOf(tags: string[], name: string): EndeavourWeaponForm | undefined {
  const tagged = WEAPON_FORM_TAGS.find(([, names]) => names.some((n) => hasTag(tags, `Gegenstand/Waffe/${n}`)))
  if (tagged) return tagged[0]
  const lower = name.toLowerCase()
  return WEAPON_FORM_NAMES.find(([, words]) => words.some((w) => lower.includes(w)))?.[0]
}

/** `Range1`/`Range2`/`Range3` (short/medium/long, e.g. `"4,5(3)"`) joined the same way
 * `legacyCharacterSheet.ts`'s `resolveWeaponAttacks()` already does for the identical field names on
 * the older vault's ranged weapon notes. */
function rangedRangeString(data: Record<string, unknown>): string | undefined {
  const parts = [data.Range1, data.Range2, data.Range3].filter((v) => v !== undefined && v !== null && v !== '').map(String)
  return parts.length > 0 ? parts.join('/') : undefined
}

const SIZE_MAP: Record<string, EndeavourItemSize> = {
  klein: 'klein',
  mittel: 'mittel',
  groß: 'gross',
  gross: 'gross',
  'sehr groß': 'sehr_gross',
  'sehr gross': 'sehr_gross',
}

function endeavourSize(raw: unknown): EndeavourItemSize | undefined {
  if (typeof raw !== 'string') return undefined
  return SIZE_MAP[raw.trim().toLowerCase()]
}

const WEIGHT_CLASS_MAP: Record<string, EndeavourWeightClass> = {
  schwer: 'schwer',
  'sehr schwer': 'sehr_schwer',
}

function endeavourWeightClass(raw: unknown): EndeavourWeightClass | undefined {
  if (typeof raw !== 'string') return undefined
  return WEIGHT_CLASS_MAP[raw.trim().toLowerCase()]
}

/** Plain text fields and wikilinked fields (e.g. `Schadensart: "[[Hiebschaden]]"`) both go through
 * `linkDisplay`: it resolves a wikilink to its display text and passes plain text through as-is. */
function stringField(raw: unknown): string | undefined {
  const display = linkDisplay(raw)
  return display || undefined
}

function numberField(raw: unknown): number | undefined {
  return typeof raw === 'number' ? raw : undefined
}

function propertyLabels(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const labels = raw.filter((p): p is string => typeof p === 'string').map((p) => linkDisplay(p))
  return labels.length > 0 ? labels : undefined
}

/** Words (lowercase, matched as whole words) naming each wear slot in a `Trageplatz`/`Art` field or
 * a `Gegenstand/Kleidung/...` tag. */
const WEAR_SLOT_WORDS: [EndeavourWearSlot, string[]][] = [
  ['cloak', ['umhang', 'mantel', 'cape', 'rücken', 'schultern', 'cloak', 'back', 'shoulders']],
  ['gloves', ['handschuhe', 'handschuh', 'hände', 'hand', 'gloves', 'hands', 'armschienen', 'bracers']],
  ['boots', ['stiefel', 'schuhe', 'füße', 'fuß', 'boots', 'feet']],
  ['necklace', ['halskette', 'kette', 'amulett', 'hals', 'anhänger', 'necklace', 'amulet', 'neck']],
  ['body', ['körper', 'oberkörper', 'torso', 'kleidung', 'gewand', 'robe', 'tunika', 'body', 'clothes', 'clothing', 'robes']],
  ['head', ['kopf', 'helm', 'hut', 'haube', 'kapuze', 'krone', 'stirnreif', 'diadem', 'head', 'helmet', 'hat', 'hood', 'circlet', 'crown']],
  ['belt', ['gürtel', 'hüfte', 'taille', 'belt', 'girdle', 'waist']],
  ['ring', ['ring', 'finger']],
]

function wearSlotFromText(raw: unknown): EndeavourWearSlot | undefined {
  const text = linkDisplay(raw).toLowerCase()
  if (!text) return undefined
  const words = text.split(/[^\p{L}]+/u)
  return WEAR_SLOT_WORDS.find(([, names]) => names.some((n) => words.includes(n)))?.[0]
}

/** An explicit `Trageplatz:` wins, then a `Gegenstand/Kleidung/<Platz>` tag, then a magic item's `Art`. */
function wearSlotOf(data: Record<string, unknown>, tags: string[]): EndeavourWearSlot | undefined {
  const explicit = wearSlotFromText(data.Trageplatz)
  if (explicit) return explicit
  const clothing = tags.find((t) => t.toLowerCase().startsWith('gegenstand/kleidung/'))
  if (clothing) return wearSlotFromText(clothing.slice('gegenstand/kleidung/'.length))
  if (tags.some((t) => t.toLowerCase() === 'gegenstand/kleidung')) return 'body'
  return hasTag(tags, 'Gegenstand/Magischer_Gegenstand') ? wearSlotFromText(data.Art) : undefined
}

function baseFields(raw: RawFile): EndeavourItemBase {
  const { data, name } = raw
  return {
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : name,
    size: endeavourSize(data.Größe),
    weight_class: endeavourWeightClass(data.Gewicht),
    cost: stringField(data.Kosten),
    plaetze: numberField(data.Plaetze),
    stack_size: numberField(data.Stapelgroesse),
    wear_slot: wearSlotOf(data, tagList(data)),
  }
}

/** The rules renamed `BW_cap` to "Max BW"; the notes still carry `BW_cap`, but accept the likely
 * spellings of a renamed field too, so a future frontmatter rename doesn't silently drop the cap. */
function maxBwField(data: Record<string, unknown>): number | undefined {
  for (const key of ['BW_cap', 'Max_BW', 'MaxBW', 'Max BW']) {
    const value = numberField(data[key])
    if (value !== undefined) return value
  }
  return undefined
}

/** Best-effort normalize, following the same shape as `normalizeLegacyCharacter`/`normalizeLegacySpellNote`.
 * Untested against real vault data — see the module doc comment. */
export function normalizeEndeavourItem(raw: RawFile): EndeavourItemFrontmatter {
  const { data } = raw
  const tags = tagList(data)
  const base = baseFields(raw)

  if (hasTag(tags, 'Gegenstand/Waffe')) {
    const weaponKind = endeavourWeaponKind(tags) ?? 'melee'
    const isMelee = weaponKind === 'melee'
    return {
      ...base,
      kind: 'weapon',
      weapon_kind: weaponKind,
      form: weaponFormOf(tags, base.name),
      hands: data.Hände === 2 || data.Hände === '2' ? 'two' : data.Hände === 1 || data.Hände === '1' ? 'one' : undefined,
      category: hasTag(tags, 'Gegenstand/Waffe/Kriegswaffe') ? 'Kriegswaffe' : hasTag(tags, 'Gegenstand/Waffe/Einfach') ? 'Einfach' : undefined,
      availability: stringField(data.Verfügbarkeit),
      range: isMelee ? stringField(data.Reichweite) : rangedRangeString(data),
      damage_dice: stringField(isMelee ? data.Schaden : data.SchadenFern),
      damage_type: stringField(isMelee ? data.Schadensart : data.SchadensartFern),
      properties: propertyLabels(isMelee ? data.Eigenschaften : data.EigenschaftenFern),
    }
  }

  if (hasTag(tags, 'Gegenstand/Rüstung')) {
    return {
      ...base,
      kind: 'armor',
      armor_category: stringField(data.Klasse),
      rk: numberField(data.RK),
      rp: numberField(data.RP),
      damage_reduction: numberField(data.SR),
      strength_requirement: numberField(data.Stärke),
      stealth_disadvantage: numberField(data.Heimlichkeit),
      bw_cap: maxBwField(data),
    }
  }

  if (hasTag(tags, 'Gegenstand/Schild')) {
    return {
      ...base,
      kind: 'shield',
      rk: numberField(data.RK),
      rp: numberField(data.RP),
      damage_reduction: numberField(data.SR),
    }
  }

  if (hasTag(tags, 'Gegenstand/Magischer_Gegenstand')) {
    return {
      ...base,
      kind: 'magic_item',
      magic_type: stringField(data.Art),
      rarity: stringField(data.Seltenheit),
      requires_attunement: data.Einstimmung === true,
      cursed: data.Verflucht === true,
      requirement: stringField(data.Voraussetzung),
    }
  }

  if (hasTag(tags, 'Gegenstand/Behälter')) {
    return {
      ...base,
      kind: 'container',
      max_size: endeavourSize(data.MaxGroesse),
    }
  }

  if (hasTag(tags, 'Gegenstand/Ausrüstung')) {
    return {
      ...base,
      kind: 'equipment',
    }
  }

  return { ...base, kind: 'tool' }
}

/** Slot cost the item takes in a container's grid — the real vault's confirmed schema states this
 * directly via `Plaetze`. Falls back to the old speculative Größe+Gewicht derivation
 * (`Gegenstandsgrößen.md`: Klein=1/Mittel=2/Groß=3/SehrGroß=4, +1 schwer/+2 sehr schwer) for items
 * that only carry those fields (e.g. the still-unconfirmed weapon/armor dummy fixtures). On a
 * container, this is its total slot *capacity*, not a cost — callers must not conflate the two. */
export function resolveSlotCost(fm: EndeavourItemFrontmatter): number | undefined {
  if (fm.plaetze !== undefined) return fm.plaetze
  if (!fm.size) return undefined
  const base = SIZE_SLOT_COST[fm.size]
  const surcharge = fm.weight_class === 'sehr_schwer' ? 2 : fm.weight_class === 'schwer' ? 1 : 0
  return base + surcharge
}

const SIZE_SLOT_COST: Record<EndeavourItemSize, number> = { klein: 1, mittel: 2, gross: 3, sehr_gross: 4 }
const SLOT_COST_SIZE: [number, EndeavourItemSize][] = [
  [1, 'klein'],
  [2, 'mittel'],
  [3, 'gross'],
]

/** Item size category — used only to check against a container's `max_size`. Uses the explicit
 * `Größe` field when present (old speculative weapon/armor schema); otherwise approximated from the
 * resolved slot cost (1→Klein, 2→Mittel, 3→Groß, 4+→Sehr Groß) since the real, confirmed equipment
 * schema no longer carries a size field of its own — see the alignment doc / plan for why this is an
 * approximation (a weight surcharge folded into `Plaetze` can inflate the apparent size a category). */
export function resolveItemSize(fm: EndeavourItemFrontmatter): EndeavourItemSize | undefined {
  if (fm.size) return fm.size
  const cost = resolveSlotCost(fm)
  if (cost === undefined) return undefined
  for (const [max, size] of SLOT_COST_SIZE) if (cost <= max) return size
  return 'sehr_gross'
}

const SIZE_ORDER: Record<EndeavourItemSize, number> = { klein: 0, mittel: 1, gross: 2, sehr_gross: 3 }

/** Ordinal comparison (Klein < Mittel < Groß < Sehr groß), e.g. `compareEndeavourItemSize(a, b) <= 0`
 * to check an item of size `a` fits a container capped at max size `b`. */
export function compareEndeavourItemSize(a: EndeavourItemSize, b: EndeavourItemSize): number {
  return SIZE_ORDER[a] - SIZE_ORDER[b]
}

/** Short kind label for the wikilink popover / item list. Derived from the item's tags, not its
 * prose, so it follows the app language like the rest of the UI chrome. */
export function endeavourItemSummary(fm: EndeavourItemFrontmatter, t: TranslateFn): string {
  switch (fm.kind) {
    case 'weapon':
      return t('endeavourInventory.kind.weapon', { kind: t(`weaponKind.${fm.weapon_kind}`) })
    case 'armor':
      return t('endeavourInventory.kind.armor')
    case 'shield':
      return t('endeavourInventory.kind.shield')
    case 'magic_item':
      return t('endeavourInventory.kind.magicItem')
    case 'tool':
      return t('endeavourInventory.kind.tool')
    case 'equipment':
      return t('endeavourInventory.kind.equipment')
    case 'container':
      return t('endeavourInventory.kind.container')
  }
}
