/**
 * The shapes `adapters/endeavourItem.ts` normalizes the Endeavour vault's item notes into. Kept apart
 * from the adapter so `types.ts` (and anything else that only needs the shapes) can depend on them
 * without pulling in parsing code — and without the import cycle that would close through the adapter.
 */

export type EndeavourItemSize = 'klein' | 'mittel' | 'gross' | 'sehr_gross'

/** Weight *surcharge* flag from `Gegenstandsgrößen.md` — separate from `size`, not a literal weight
 * number. (Open question in the analysis doc: the embed display table's "Gewicht" column header
 * suggests some authors may instead mean a literal weight — unconfirmed either way.) */
export type EndeavourWeightClass = 'schwer' | 'sehr_schwer'

export type EndeavourWeaponKind = 'melee' | 'ranged' | 'thrown'

/** What a weapon looks like, for drawing it in the character's hand — see `weaponFormOf`. */
export type EndeavourWeaponForm = 'sword' | 'dagger' | 'axe' | 'mace' | 'staff' | 'polearm' | 'bow' | 'crossbow'

/** Where a worn accessory goes on the equipment loadout: head, body (clothing, worn in the armor
 * slot), shoulders, hands, waist, feet, neck or a finger. */
export type EndeavourWearSlot = 'head' | 'body' | 'cloak' | 'gloves' | 'belt' | 'boots' | 'necklace' | 'ring'

export interface EndeavourItemBase {
  name: string
  size?: EndeavourItemSize
  weight_class?: EndeavourWeightClass
  cost?: string
  /** `Plaetze` — direct, authoritative slot cost (or, on a container, total slot capacity) from the
   * real vault's confirmed item schema. Takes priority over the `size`/`weight_class` derivation
   * below whenever present — see `resolveSlotCost()`. */
  plaetze?: number
  /** `Stapelgroesse` — how many units share one slot (rule `Gegenstandsgrößen#Stapelbare
   * Kleinstitems`, e.g. 4 torches or 4 throwing knives per slot). Any item kind may carry it; a
   * placed stack tracks how many units are left (see `EndeavourStackEntry`). */
  stack_size?: number
  /** Worn over the shoulders, on the hands, feet, neck or a finger — see `wearSlotOf`. The vault has no such items yet;
   * this reads a `Trageplatz:` field (any kind), a `Gegenstand/Kleidung/<Platz>` tag, or a magic
   * item's `Art` (e.g. `Art: Ring`). */
  wear_slot?: EndeavourWearSlot
}

export interface EndeavourWeaponItem extends EndeavourItemBase {
  kind: 'weapon'
  weapon_kind: EndeavourWeaponKind
  /** `Hände` — one- or two-handed. */
  hands?: 'one' | 'two'
  /** Sword, axe, bow, ... — from a `Gegenstand/Waffe/<Form>` tag, else the name; see `weaponFormOf`. */
  form?: EndeavourWeaponForm
  /** Derived from the `Gegenstand/Waffe/Einfach` ("Einfach"/simple) vs `Gegenstand/Waffe/Kriegswaffe`
   * ("Kriegswaffe"/martial) tag — there's no separate `Kategorie` field on real weapon notes. */
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
  /** `Heimlichkeit` — a numeric stealth-check malus (e.g. `-1`) on real armor/shield notes, not the
   * boolean flag originally guessed here; blank/absent means no penalty. */
  stealth_disadvantage?: number
  /** "Max BW" (`Rüstungsbeschreibung#Max BW`) — caps the BW part of the wearer's evasion value
   * (`Ausweichwert`); absent = no cap. Stored as `BW_cap` on the notes; see `maxBwField`. */
  bw_cap?: number
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
