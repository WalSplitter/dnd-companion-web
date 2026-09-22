import type { EndeavourItemFrontmatter } from './adapters/endeavourItem'

export type { EndeavourItemFrontmatter } from './adapters/endeavourItem'

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export const ABILITIES: { key: AbilityKey; label: string }[] = [
  { key: 'str', label: 'Strength' },
  { key: 'dex', label: 'Dexterity' },
  { key: 'con', label: 'Constitution' },
  { key: 'int', label: 'Intelligence' },
  { key: 'wis', label: 'Wisdom' },
  { key: 'cha', label: 'Charisma' },
]

export type SkillKey =
  | 'acrobatics'
  | 'animal_handling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleight_of_hand'
  | 'stealth'
  | 'survival'

export const SKILLS: { key: SkillKey; label: string; ability: AbilityKey }[] = [
  { key: 'athletics', label: 'Athletics', ability: 'str' },
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dex' },
  { key: 'sleight_of_hand', label: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth', label: 'Stealth', ability: 'dex' },
  { key: 'arcana', label: 'Arcana', ability: 'int' },
  { key: 'history', label: 'History', ability: 'int' },
  { key: 'investigation', label: 'Investigation', ability: 'int' },
  { key: 'nature', label: 'Nature', ability: 'int' },
  { key: 'religion', label: 'Religion', ability: 'int' },
  { key: 'animal_handling', label: 'Animal Handling', ability: 'wis' },
  { key: 'insight', label: 'Insight', ability: 'wis' },
  { key: 'medicine', label: 'Medicine', ability: 'wis' },
  { key: 'perception', label: 'Perception', ability: 'wis' },
  { key: 'survival', label: 'Survival', ability: 'wis' },
  { key: 'deception', label: 'Deception', ability: 'cha' },
  { key: 'intimidation', label: 'Intimidation', ability: 'cha' },
  { key: 'performance', label: 'Performance', ability: 'cha' },
  { key: 'persuasion', label: 'Persuasion', ability: 'cha' },
]

/**
 * The real "Endeavour" campaign vault's ruleset (tagged `Regeln/Nimble` throughout
 * `01 - Spielerbereich/Regeln/Allgemein/Attribute|Fertigkeiten|Rettungswürfe`) uses eight attributes
 * instead of the six D&D-style `abilities` above — notably splitting D&D's DEX into `bw`
 * (Beweglichkeit: dodge/initiative/acrobatics) and `ge` (Geschick: ranged attacks, finesse, precise
 * handwork), and WIS into `in` (Instinkt: perception/insight/survival) and `vs` (Verstand:
 * knowledge skills, folded in with INT-like lore). An attribute's value (-5..+5) is used directly as
 * the roll modifier — there's no D&D-style score-to-modifier conversion. Two-letter keys match the
 * vault's own abbreviations (see each attribute note's `aliases`) rather than inventing new ones.
 */
export type NimbleAttributeKey = 'st' | 'bw' | 'ko' | 'ge' | 'in' | 'vs' | 'pr' | 'en'

export const NIMBLE_ATTRIBUTES: { key: NimbleAttributeKey; label: string }[] = [
  { key: 'st', label: 'Stärke' },
  { key: 'bw', label: 'Beweglichkeit' },
  { key: 'ko', label: 'Konstitution' },
  { key: 'ge', label: 'Geschick' },
  { key: 'in', label: 'Instinkt' },
  { key: 'vs', label: 'Verstand' },
  { key: 'pr', label: 'Präsenz' },
  { key: 'en', label: 'Entschlossenheit' },
]

/** Only six of the eight attributes back a saving throw (see `Rettungswürfe/`) — `ge` and `in` don't
 * (per their own rule notes, they're used for attacks/turn order instead). */
export const NIMBLE_SAVE_ATTRIBUTES: NimbleAttributeKey[] = ['st', 'bw', 'ko', 'vs', 'pr', 'en']

/**
 * The vault's 18 Nimble skills (`Regeln/Allgemein/Fertigkeiten/`) turn out to share the exact same
 * names as this app's own D&D-shaped `SkillKey`s — just regrouped under different governing
 * attributes (e.g. `medicine` moves from D&D's WIS to Nimble's `vs`/Verstand) — so `SkillKey` and its
 * `skill.*` i18n labels are reused as-is; only this attribute mapping is Nimble-specific.
 */
/**
 * Bridges an `AbilityKey` (still used untouched by AC/initiative/spellcasting math — see
 * `CharacterFrontmatter.nimble_attributes`'s doc comment) to its closest Nimble attribute, purely so
 * a stat that's labeled by ability (e.g. the spellcasting ability plate) can show the vault's own
 * terminology instead of a stray D&D letter on an otherwise all-Nimble sheet.
 */
export const ABILITY_TO_NIMBLE_ATTRIBUTE: Record<AbilityKey, NimbleAttributeKey> = {
  str: 'st',
  dex: 'bw',
  con: 'ko',
  int: 'vs',
  wis: 'in',
  cha: 'pr',
}

export const NIMBLE_SKILL_ATTRIBUTES: Record<SkillKey, NimbleAttributeKey> = {
  athletics: 'st',
  acrobatics: 'bw',
  sleight_of_hand: 'ge',
  stealth: 'ge',
  arcana: 'vs',
  history: 'vs',
  investigation: 'vs',
  nature: 'vs',
  religion: 'vs',
  medicine: 'vs',
  animal_handling: 'in',
  insight: 'in',
  perception: 'in',
  survival: 'in',
  deception: 'pr',
  intimidation: 'pr',
  performance: 'pr',
  persuasion: 'pr',
}

export interface CharacterClass {
  name: string
  level: number
  subclass?: string
}

export interface SpellSlotInfo {
  max: number
  used: number
}

export interface SpellcastingInfo {
  ability: AbilityKey
  slots?: Record<string, SpellSlotInfo>
}

export interface Currency {
  cp?: number
  sp?: number
  ep?: number
  gp?: number
  pp?: number
}

export interface FieldWriteTarget {
  /** Vault file path to patch — may differ from the character's own file (e.g. a legacy spell sheet). */
  path: string
  /** Dotted key path within that file's frontmatter, e.g. `['Gesundheit', 'TP']`. */
  keyPath: string[]
  /** How the UI's logical value maps to the raw value written to disk. 'direct' (default) writes it
   * as-is; 'invert-from-max' covers the legacy vault's *remaining*-slot counters — the UI tracks
   * "used", disk stores "remaining", so the write is `max - used`. */
  encode?: 'direct' | 'invert-from-max'
  max?: number
}

export interface CharacterWriteTargets {
  hp_current?: FieldWriteTarget
  hp_temp?: FieldWriteTarget
  /** Logical value written is the *remaining* hit dice count (matches `hit_dice.total - used`). */
  hit_dice_remaining?: FieldWriteTarget
  /** One target per luck pip, index-aligned with `conditions.luck_points` (length === max). */
  luck_points?: FieldWriteTarget[]
  exhaustion?: FieldWriteTarget
  /** Keyed by spell grade (same keys as `spellcasting.slots`). */
  spell_slots?: Record<string, FieldWriteTarget>
  abilities?: Record<AbilityKey, FieldWriteTarget>
  /** Legacy schema only (own-schema stores this as a YAML array, not a per-key scalar). Raw value is 0|1. */
  saving_throw_proficiencies?: Record<AbilityKey, FieldWriteTarget>
  /** Legacy schema only, same reason. Raw value is 0 (none) | 1 (proficient) | 2 (expertise). */
  skills?: Record<SkillKey, FieldWriteTarget>
  nimble_attributes?: Record<NimbleAttributeKey, FieldWriteTarget>
  nimble_skills?: Partial<Record<SkillKey, FieldWriteTarget>>
  /** File that actually owns `endeavour_inventory` — the character's own file, or a linked sheet
   * (see `resolveLinkedCharacterExtensions`). Absent when neither carries the field yet (a brand-new
   * character placing their first item has nowhere on disk to write it — see `setEndeavourInventory`). */
  endeavour_inventory?: { path: string }
}

export interface ConditionsInfo {
  /** Luck points currently held (not "spent") — see the vault's `Glück` rule note. `held` is the
   * per-pip source of truth (index-aligned, length === max) so a single pip can be toggled without
   * assuming the held points are contiguous; `current` is just their count, for display. */
  luck_points?: { max: number; current: number; held: boolean[] }
  exhaustion?: number
  exhaustion_max?: number
  notes?: string
}

export interface ResourcePool {
  name: string
  current: number
  max: number
}

export type WeaponKind = 'melee' | 'ranged' | 'thrown'

export interface WeaponAttack {
  name: string
  kind: WeaponKind
  attack_bonus: number
  damage_dice: string
  damage_bonus: number
  damage_type?: string
  range: string
  properties?: string[]
}

export interface CharacterFrontmatter {
  type: 'character'
  name: string
  class: CharacterClass[]
  species: string
  background: string
  alignment: string
  experience: number
  abilities: Record<AbilityKey, number>
  proficiency_bonus: number
  saving_throw_proficiencies: AbilityKey[]
  skill_proficiencies: SkillKey[]
  skill_expertise?: SkillKey[]
  armor_class: number
  speed: string
  hp: { current: number; max: number; temp?: number }
  hit_dice: { die: string; total: number; used?: number }
  death_saves?: { successes?: number; failures?: number }
  senses?: { darkvision?: string; blindsight?: string; tremorsense?: string; truesight?: string }
  languages?: string[]
  tool_proficiencies?: string[]
  /**
   * Entries are usually `[[Item Name]]` wikilinks resolved against `type: item` vault files.
   * Adapters for vault formats without per-item files (see `adapters/`) may instead emit
   * inline items with the data already attached, skipping wikilink resolution entirely.
   */
  inventory?: { equipped?: InventoryEntry[]; carried?: InventoryEntry[] }
  /** Slot-grid inventory (new "Endeavour" container/`Plaetze` system) — see
   * `EndeavourContainerSlotAssignment`. Present only for characters using that system; absent
   * everywhere else, in which case the UI falls back to `inventory` above. */
  endeavour_inventory?: { containers: EndeavourContainerSlotAssignment[] }
  currency?: Currency
  spellcasting?: SpellcastingInfo
  spells_known?: string[]
  features?: CharacterFeature[]
  /**
   * Real "Endeavour"/Nimble ruleset attributes/skills (see `NIMBLE_ATTRIBUTES`/`NIMBLE_SKILL_ATTRIBUTES`)
   * — present only for characters using that vault's actual rules instead of this schema's default
   * D&D-shaped `abilities`/`skill_proficiencies`. When present, the Ability Scores/Skills/Saving
   * Throws cards render these instead. `abilities`/`proficiency_bonus` stay a required bridge either
   * way — combat math untouched by this (AC, initiative, spellcasting DC) still reads them directly.
   */
  nimble_attributes?: Record<NimbleAttributeKey, number>
  nimble_skills?: Partial<Record<SkillKey, number>>
  /** Object/data URL for a portrait image, resolved from a vault-relative wikilink/attachment reference. */
  portrait_url?: string
  conditions?: ConditionsInfo
  /** Per-class resource pools beyond spell slots (e.g. a Sorcerer's sorcery points). */
  resource_pools?: ResourcePool[]
  attacks?: WeaponAttack[]
  /** Persistence metadata (not display data) for write-back — see `writeback/`. Absent for a field
   * means it's read-only: no known single vault location to patch. */
  _write?: CharacterWriteTargets
}

export interface CharacterFeature {
  name: string
  source?: string
  description?: string
}

/** A vault-file wikilink (`"[[Name]]"`, resolved against `type: item` files) or an inline item with data already attached. */
export type InventoryEntry = string | InlineItem

export interface InlineItem {
  name: string
  quantity?: number
  weight_lb?: number
  /** Set only when the value actually came from a `count{n}`/`gewicht{n}` frontmatter fallback
   * field (Meta-Bind-style sheets) rather than a literal number typed into the table cell. */
  _write?: { quantity?: FieldWriteTarget; weight_lb?: FieldWriteTarget }
}

/** One equipped container (a backpack/`Gepäck` or a belt pouch/`Schnellzugriff`, see `Inventar.md`)
 * and what's placed inside it, for the new slot-grid inventory UI — see
 * `src/features/inventory/components/EndeavourInventoryGrid.tsx`. Kept separate from `inventory`
 * above (that field stays wikilink-list based, used by the native/legacy schemas); this shape is
 * additive and only populated by characters using the Endeavour container/`Plaetze` system. */
export interface EndeavourContainerSlotAssignment {
  /** Wikilink to the equipped container item, e.g. `"[[Rucksack (Groß)]]"`. */
  container: string
  /** The items placed inside, in grid fill order (row-major, see `grid.ts`). */
  items: EndeavourInventoryEntry[]
}

/** A wikilink to a vault item note, a player-created temporary item (see `EndeavourCustomItem`), or a
 * placed stack of a consumable item that tracks remaining uses (see `EndeavourStackEntry`). */
export type EndeavourInventoryEntry = string | EndeavourCustomItem | EndeavourStackEntry

/**
 * A placed vault-item wikilink whose note tracks per-stack uses (`Stapelgroesse` — e.g. a torch
 * usable 4 times before it's spent; see `EndeavourEquipmentItem.stack_size`). Kept distinct from the
 * plain wikilink string above so the vast majority of non-stackable items never carry an unused
 * counter. `charges` starts at the item's `stack_size` when placed and is then adjusted independently
 * per tile — never re-derived from `stack_size` afterward, so a partially-used stack survives reloads.
 */
export interface EndeavourStackEntry {
  link: string
  charges: number
}

/**
 * Fallback for gear picked up spontaneously in a session that the DM hasn't written an item note for
 * yet: stored inline on the character sheet only (name + slot cost) — deliberately never turned into
 * a markdown page automatically, to avoid duplicates/wrong entries in the vault. The DM later
 * replaces it with a real `[[Wikilink]]` entry once an actual item page exists. Each unit is its own
 * entry (no quantity field), matching how vault items are placed one tile per unit.
 */
export interface EndeavourCustomItem {
  name: string
  plaetze: number
}

export interface ItemFrontmatter {
  type: 'item'
  name: string
  category?: string
  weight_lb?: number
  quantity?: number
  value?: Currency
  properties?: string[]
}

export interface SpellDamageScaling {
  at_level: number
  dice: string
}

export interface SpellFrontmatter {
  type: 'spell'
  name: string
  level: number
  school: string
  casting_time: string
  range: string
  components: string[]
  duration: string
  classes?: string[]
  damage?: string
  damage_scaling?: SpellDamageScaling[]
  damage_type?: string
  target?: string
  save_ability?: AbilityKey
  concentration?: boolean
  ritual?: boolean
  scalable?: boolean
  spell_type?: string
}

export type VaultFrontmatter = CharacterFrontmatter | ItemFrontmatter | SpellFrontmatter

export interface VaultFile<T = VaultFrontmatter> {
  path: string
  frontmatter: T
  body: string
}

export interface VaultSourceFile {
  path: string
  content: string
}

/** A vault markdown file that doesn't match any structured schema (rule pages, class/feature lore,
 * etc.) — kept only so `[[Wikilink]]`s pointing at it can still resolve to *something* in the UI. */
export interface VaultNote {
  path: string
  name: string
  body: string
}

export interface Vault {
  characters: VaultFile<CharacterFrontmatter>[]
  items: VaultFile<ItemFrontmatter>[]
  spells: VaultFile<SpellFrontmatter>[]
  notes: VaultNote[]
  /** Items detected via the experimental "Endeavour" vault tag scheme (`Gegenstand/Waffe/...`) —
   * see `adapters/endeavourItem.ts`. Kept separate from `items` (the native `type: item` schema)
   * rather than merged in; see that module's doc comment for why. */
  endeavourItems: VaultFile<EndeavourItemFrontmatter>[]
}
