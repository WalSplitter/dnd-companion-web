import type { RawFile } from '../rawFile'
import { linkDisplay } from './legacyCharacterSheet'

/**
 * DRAFT / SPECULATIVE — adapter skeleton for the new "Endeavour" campaign vault
 * (`E:\Git\Endeavour_PlayerVault`), which the DM has described as a preliminary export, far from
 * final. See `docs/inventory-vault-alignment.md` for the full analysis this is based on.
 *
 * Every field below is inferred from hidden Dataview display templates
 * (`zHidden\_Embeds\embed Gegenstand\*`) meant to be transcluded into item notes — **no real item
 * note exists in the vault yet** to confirm field names/types against. Treat every type here as
 * likely to change once the DM ships real item/character notes.
 *
 * Wired into `buildVault()` (`parseFrontmatter.ts`), but deliberately into its own
 * `Vault.endeavourItems` collection rather than the native `Vault.items` — the tag scheme this
 * detects (`Gegenstand/Waffe/...`) is the same one the *existing* legacy vault's weapon/armor notes
 * already carry (see `legacyCharacterSheet.ts`'s `resolveWeaponAttacks`), so folding these into
 * `vault.items` would also change behavior for a vault this app already supports (its own
 * weapon/armor notes would start showing up there too) — a decision to make deliberately once real
 * Endeavour item notes exist, not a side effect of this dev-only scaffolding
 * (see `src/dev-vault/`, itself temporary until the DM ships real character/item notes).
 */

export type EndeavourItemSize = 'klein' | 'mittel' | 'gross' | 'sehr_gross'

/** Weight *surcharge* flag from `Gegenstandsgrößen.md` — separate from `size`, not a literal weight
 * number. (Open question in the analysis doc: the embed display table's "Gewicht" column header
 * suggests some authors may instead mean a literal weight — unconfirmed either way.) */
export type EndeavourWeightClass = 'schwer' | 'sehr_schwer'

export type EndeavourWeaponKind = 'melee' | 'ranged' | 'thrown'

interface EndeavourItemBase {
  name: string
  size?: EndeavourItemSize
  weight_class?: EndeavourWeightClass
  cost?: string
  /** `Plaetze` — direct, authoritative slot cost (or, on a container, total slot capacity) from the
   * real vault's confirmed item schema. Takes priority over the `size`/`weight_class` derivation
   * below whenever present — see `resolveSlotCost()`. */
  plaetze?: number
}

export interface EndeavourWeaponItem extends EndeavourItemBase {
  kind: 'weapon'
  weapon_kind: EndeavourWeaponKind
  /** `Hände` — one- or two-handed. */
  hands?: 'one' | 'two'
  /** `Kategorie` — e.g. simple/martial. Kept as free text, taxonomy not confirmed yet. */
  category?: string
  /** `Verfügbarkeit`. */
  availability?: string
  /** `Reichweite` — same field name the legacy vault already uses for melee weapons. */
  range?: string
  /** `Schaden` — same field name as the legacy vault. */
  damage_dice?: string
  /** `Schadensart` — same field name as the legacy vault; resolved link display text. */
  damage_type?: string
  /** `Eigenschaften` — trait wikilinks (e.g. `[[Finesse]]`), resolved to display text. */
  properties?: string[]
}

export interface EndeavourArmorItem extends EndeavourItemBase {
  kind: 'armor'
  /** `Klasse` — light/medium/heavy-ish category. Free text, taxonomy not confirmed. */
  armor_category?: string
  /**
   * The vault's own display table calls this `RK`; the character-sheet AC formula that reads a
   * *linked* armor page instead reads `RP` — an unresolved naming inconsistency in the source vault
   * itself (see analysis doc §5, open question 3). Both are captured until the DM confirms which is
   * authoritative.
   */
  rk?: number
  rp?: number
  /** `SR` — damage reduction. */
  damage_reduction?: number
  /** `Stärke` — STR requirement to avoid a penalty. */
  strength_requirement?: number
  /** `Heimlichkeit` — stealth disadvantage flag. */
  stealth_disadvantage?: boolean
  /** `BW_cap` — movement speed cap while worn. */
  speed_cap?: number
}

export interface EndeavourShieldItem extends EndeavourItemBase {
  kind: 'shield'
  rk?: number
  rp?: number
  damage_reduction?: number
}

export interface EndeavourMagicItem extends EndeavourItemBase {
  kind: 'magic_item'
  /** `Art` — magic item type. */
  magic_type?: string
  /** `Seltenheit` — rarity. */
  rarity?: string
  /** `Einstimmung` — attunement required. */
  requires_attunement?: boolean
  /** `Verflucht` — cursed. */
  cursed?: boolean
  /** `Voraussetzung` — requirement to use/attune. */
  requirement?: string
}

export interface EndeavourToolItem extends EndeavourItemBase {
  kind: 'tool'
}

/** Generic gear (`Gegenstand/Ausrüstung`) — the real vault's confirmed, simple item schema: just
 * `Kosten`/`Plaetze`/`Stapelgroesse`, no size/weight-class fields at all. */
export interface EndeavourEquipmentItem extends EndeavourItemBase {
  kind: 'equipment'
  /** `Stapelgroesse` — max stack size. Per the DM's own annotation on the mockup, this does *not*
   * mean several units share one grid cell: each unit is still placed as its own tile. Kept for
   * display and to cap how many can be added in one "Hinzufügen" action. */
  stack_size?: number
}

/** A wearable/carryable container (`Gegenstand/Behälter`) — a backpack (`Gepäck`) or belt pouch
 * (`Schnellzugriff`), per `Inventar.md`. `plaetze` is its total slot capacity here, not a cost. */
export interface EndeavourContainerItem extends EndeavourItemBase {
  kind: 'container'
  /** `MaxGroesse` — largest item size this container accepts (see `Gepäck.md`/`Schnellzugriff.md`). */
  max_size?: EndeavourItemSize
}

export type EndeavourItemFrontmatter =
  | EndeavourWeaponItem
  | EndeavourArmorItem
  | EndeavourShieldItem
  | EndeavourMagicItem
  | EndeavourToolItem
  | EndeavourEquipmentItem
  | EndeavourContainerItem

function tagList(data: Record<string, unknown>): string[] {
  const tags = data.tags
  return Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : []
}

function hasTag(tags: string[], needle: string): boolean {
  return tags.some((t) => t === needle || t.startsWith(`${needle}/`))
}

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

function endeavourWeaponKind(tags: string[]): EndeavourWeaponKind | undefined {
  if (hasTag(tags, 'Gegenstand/Waffe/Klasse/Nahkampfwaffe')) return 'melee'
  if (hasTag(tags, 'Gegenstand/Waffe/Klasse/Fernkampfwaffe/Wurfwaffe')) return 'thrown'
  if (hasTag(tags, 'Gegenstand/Waffe/Klasse/Fernkampfwaffe')) return 'ranged'
  return undefined
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

function baseFields(raw: RawFile): EndeavourItemBase {
  const { data, name } = raw
  return {
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : name,
    size: endeavourSize(data.Größe),
    weight_class: endeavourWeightClass(data.Gewicht),
    cost: stringField(data.Kosten),
    plaetze: numberField(data.Plaetze),
  }
}

/** Best-effort normalize, following the same shape as `normalizeLegacyCharacter`/`normalizeLegacySpellNote`.
 * Untested against real vault data — see the module doc comment. */
export function normalizeEndeavourItem(raw: RawFile): EndeavourItemFrontmatter {
  const { data } = raw
  const tags = tagList(data)
  const base = baseFields(raw)

  if (hasTag(tags, 'Gegenstand/Waffe')) {
    return {
      ...base,
      kind: 'weapon',
      weapon_kind: endeavourWeaponKind(tags) ?? 'melee',
      hands: data.Hände === 2 || data.Hände === '2' ? 'two' : data.Hände === 1 || data.Hände === '1' ? 'one' : undefined,
      category: stringField(data.Kategorie),
      availability: stringField(data.Verfügbarkeit),
      range: stringField(data.Reichweite),
      damage_dice: stringField(data.Schaden),
      damage_type: stringField(data.Schadensart),
      properties: propertyLabels(data.Eigenschaften),
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
      stealth_disadvantage: data.Heimlichkeit === true,
      speed_cap: numberField(data.BW_cap),
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
      stack_size: numberField(data.Stapelgroesse),
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

const WEAPON_KIND_LABEL: Record<EndeavourWeaponKind, string> = { melee: 'Nahkampf', ranged: 'Fernkampf', thrown: 'Wurf' }

/** Short German label for the wikilink popover / item list — kept in German (not run through the
 * app's i18n dictionary) since it's derived from vault content/tags, not app UI chrome. */
export function endeavourItemSummary(fm: EndeavourItemFrontmatter): string {
  switch (fm.kind) {
    case 'weapon':
      return `Waffe (${WEAPON_KIND_LABEL[fm.weapon_kind]})`
    case 'armor':
      return 'Rüstung'
    case 'shield':
      return 'Schild'
    case 'magic_item':
      return 'Magischer Gegenstand'
    case 'tool':
      return 'Werkzeug'
    case 'equipment':
      return 'Ausrüstung'
    case 'container':
      return 'Behälter'
  }
}
