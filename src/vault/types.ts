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
  /** One target per luck pip, index-aligned with `conditions.luck_points` (length === max). */
  luck_points?: FieldWriteTarget[]
  exhaustion?: FieldWriteTarget
  /** Keyed by spell grade (same keys as `spellcasting.slots`). */
  spell_slots?: Record<string, FieldWriteTarget>
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
  currency?: Currency
  spellcasting?: SpellcastingInfo
  spells_known?: string[]
  features?: CharacterFeature[]
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
}
