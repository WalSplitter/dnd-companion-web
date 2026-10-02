import type { EndeavourItemFrontmatter } from '../../vault/adapters/endeavourItem'
import type { CharacterFrontmatter, EndeavourContainerSlotAssignment, EndeavourStackEntry, EquipmentChange } from '../../vault/types'
import { wikilinkTarget } from '../../vault/wikilinkSyntax'
import { resolveEndeavourItemLink, type VaultIndex } from '../../vault/wikilinks'
import { isCustomEntry, isStackEntry, resolveContainers, tryPlaceEntry, type PlaceFailure } from './grid'

/**
 * Equipping from the slot-grid inventory. What a character wears and wields lives on its own note
 * (`armor:`, `shield:`, `head:`, `cloak:`, `gloves:`, `belt:`, `boots:`, `necklace:`, the `rings:` list, the weapons in
 * `attacks:` — a wikilink, or a `{ link, charges }` stack for stackable weapons like throwing knives)
 * and takes no slots: equipping moves the item out of its container, unequipping stows it back into
 * one. Armor, shield, head, cloak, gloves, belt, boots and necklace have one slot each — equipping a second one swaps the
 * first back into the inventory; there are `MAX_RINGS` ring slots, and weapons are a list.
 */

/** The slots that hold exactly one item. */
export type WornSlot = 'armor' | 'shield' | 'head' | 'cloak' | 'gloves' | 'belt' | 'boots' | 'necklace'

export type EquipSlot = WornSlot | 'ring' | 'weapon'

/** One equipped item: a worn one, the ring at `position` in `rings`, or the weapon at `position` in
 * `attack_entries`. */
export type EquippedRef = { slot: WornSlot } | { slot: 'weapon' | 'ring'; position: number }

/** One ring per hand. */
export const MAX_RINGS = 2

const WORN_SLOTS: readonly WornSlot[] = ['armor', 'shield', 'head', 'cloak', 'gloves', 'belt', 'boots', 'necklace']

export function isWornSlot(slot: unknown): slot is WornSlot {
  return WORN_SLOTS.includes(slot as WornSlot)
}

export type EquipFailure = PlaceFailure | 'not_equippable'

/** On success, `equipped` says where an equipped item ended up on the loadout (unset when unequipping). */
export type EquipResult = { ok: true; change: EquipmentChange; equipped?: EquippedRef } | { ok: false; reason: EquipFailure; name?: string }

/** Where an item goes when equipped: armor, shields and weapons by kind, anything else by where it is
 * worn (`wear_slot`); `undefined` for gear that can't be equipped. Armor with a `Trageplatz` (a helm
 * worn on the head) goes there instead of the body-armor slot; clothing (`body`) goes into the armor
 * slot. */
export function equipSlotOf(fm: EndeavourItemFrontmatter | undefined): EquipSlot | undefined {
  if (fm?.kind === 'shield') return fm.kind
  if (fm?.kind === 'weapon') return 'weapon'
  const worn = fm?.kind === 'armor' ? (fm.wear_slot ?? 'armor') : fm?.wear_slot
  return worn === 'body' ? 'armor' : worn
}

/** How the body-armor slot's item is drawn on the character: plain clothing, or light, medium or
 * heavy armor by its `Klasse` (`[[Leichte Rüstung|Leicht]]`, `Mittel`, `Schwer`). Armor without a
 * recognizable class counts as medium; anything else worn there (a robe, a tunic) is clothing. */
export type ArmorLook = 'clothing' | 'light' | 'medium' | 'heavy'

export function armorLookOf(fm: EndeavourItemFrontmatter | undefined): ArmorLook {
  if (fm?.kind !== 'armor') return 'clothing'
  const category = fm.armor_category?.toLowerCase() ?? ''
  if (/kleid|stoff|cloth|robe/.test(category)) return 'clothing'
  if (/leicht|light/.test(category)) return 'light'
  if (/schwer|heavy/.test(category) && !/mittel/.test(category)) return 'heavy'
  return 'medium'
}

/** Selection identity of an equipped item, distinct from any inventory tile's `entryKey`. */
export function equippedKey(ref: EquippedRef): string {
  return 'position' in ref ? `equipped:${ref.slot}:${ref.position}` : `equipped:${ref.slot}`
}

/** A weapon entry of `attacks:` that is a stack (`{ link, charges }`, e.g. throwing knives), as opposed
 * to a plain wikilink or a written-out attack. */
export function isEquippedStack(entry: unknown): entry is EndeavourStackEntry {
  if (!entry || typeof entry !== 'object') return false
  const e = entry as Record<string, unknown>
  return typeof e.link === 'string' && typeof e.charges === 'number'
}

/** The equipped weapons — wikilinks and stacks, with their position in `attack_entries` (written-out
 * attacks are skipped). `charges` is set for a stack. */
export function equippedWeapons(character: CharacterFrontmatter): { position: number; link: string; charges?: number }[] {
  return (character.attack_entries ?? []).flatMap((entry, position) => {
    if (isEquippedStack(entry)) return [{ position, link: entry.link, charges: entry.charges }]
    return typeof entry === 'string' && entry.trim() ? [{ position, link: entry }] : []
  })
}

/** The wikilink an equipped ref points at, if it is still there. */
export function equippedLink(character: CharacterFrontmatter, ref: EquippedRef): string | undefined {
  const raw = ref.slot === 'weapon' ? character.attack_entries?.[ref.position] : ref.slot === 'ring' ? character.rings?.[ref.position] : character[ref.slot]
  const link = isEquippedStack(raw) ? raw.link : raw
  return typeof link === 'string' && link.trim() ? link : undefined
}

function sameLink(a: string, b: string): boolean {
  return wikilinkTarget(a).trim().toLowerCase() === wikilinkTarget(b).trim().toLowerCase()
}

function itemName(index: VaultIndex, link: string): string {
  return resolveEndeavourItemLink(index, link)?.frontmatter.name ?? wikilinkTarget(link)
}

/** `Stapelgroesse` of a stackable item, `undefined` for anything that doesn't stack. */
function stackSizeOf(index: VaultIndex, link: string): number | undefined {
  const size = resolveEndeavourItemLink(index, link)?.frontmatter.stack_size
  return size !== undefined && size > 1 ? size : undefined
}

/**
 * Puts `link` back into the inventory — `count` units of a stackable item (`Stapelgroesse` > 1),
 * which first top up partial stacks of the same item and then take fresh slots as full stacks, or
 * the single item otherwise. Tries only `preferred` when given (the container it was dropped on),
 * otherwise the backpacks before the 1-slot quick-access pouches. All or nothing.
 */
export function stowLink(
  containers: EndeavourContainerSlotAssignment[],
  index: VaultIndex,
  link: string,
  preferred?: number,
  count = 1,
): { ok: true; containers: EndeavourContainerSlotAssignment[] } | { ok: false; reason: PlaceFailure } {
  const resolved = resolveContainers(containers, index)
  const order =
    preferred !== undefined
      ? [preferred]
      : [...resolved.filter((r) => r.capacity !== 1), ...resolved.filter((r) => r.capacity === 1)].map((r) => r.containerIndex)
  let next = containers
  const withItems = (containerIndex: number, items: EndeavourContainerSlotAssignment['items']) =>
    next.map((c, i) => (i === containerIndex ? { ...c, items } : c))

  const stackSize = stackSizeOf(index, link)
  let left = stackSize ? Math.max(0, count) : 1
  if (stackSize) {
    for (const containerIndex of order) {
      const items = next[containerIndex]?.items ?? []
      next = withItems(
        containerIndex,
        items.map((e) => {
          if (left <= 0 || !isStackEntry(e) || !sameLink(e.link, link) || e.charges >= stackSize) return e
          const added = Math.min(left, stackSize - e.charges)
          left -= added
          return { ...e, charges: e.charges + added }
        }),
      )
    }
    if (left === 0) return { ok: true, containers: next } // nothing (left) to stow
  }

  // Whatever is left takes fresh slots: full stacks (the last one partial), or the single item.
  do {
    const units = stackSize ? Math.min(left, stackSize) : 1
    const entry = stackSize ? { link, charges: units } : link
    let placed = false
    let reason: PlaceFailure = 'no_room'
    for (const containerIndex of order) {
      const assignment = next[containerIndex]
      if (!assignment) continue
      const result = tryPlaceEntry(resolveContainers(next, index), index, assignment.items, entry, containerIndex)
      if (result.ok) {
        next = withItems(containerIndex, result.items)
        placed = true
        break
      }
      if (preferred !== undefined) reason = result.reason
    }
    if (!placed) return { ok: false, reason }
    left -= units
  } while (left > 0)
  return { ok: true, containers: next }
}

/** Adds a weapon to `attack_entries`: a stack merges into an equipped stack of the same item as far
 * as it has room, the rest becomes an equipped stack of its own. Returns the new list and the
 * position the weapon ended up at. */
function addWeapon(entries: unknown[], link: string, charges: number | undefined, stackSize: number | undefined): { entries: unknown[]; position: number } {
  if (charges === undefined || !stackSize) return { entries: [...entries, link], position: entries.length }
  let left = charges
  let position = -1
  const merged = entries.map((e, i) => {
    if (left <= 0 || !isEquippedStack(e) || !sameLink(e.link, link) || e.charges >= stackSize) return e
    const added = Math.min(left, stackSize - e.charges)
    left -= added
    if (position < 0) position = i
    return { ...e, charges: e.charges + added }
  })
  if (left > 0 || position < 0) return { entries: [...merged, { link, charges: left }], position: merged.length }
  return { entries: merged, position }
}

/** Equips `link` on top of `containers` (already without the item): a worn slot swaps out whatever
 * was worn before, which goes back into the inventory — preferably into `stowInto`. A ring takes the
 * next free ring slot, or swaps out the ring at `ringPosition` (the first one by default) once both
 * are taken. A weapon stack brings its `charges` along. */
function equipLink(
  character: CharacterFrontmatter,
  index: VaultIndex,
  containers: EndeavourContainerSlotAssignment[],
  link: string,
  stowInto?: number,
  charges?: number,
  ringPosition?: number,
): EquipResult {
  const slot = equipSlotOf(resolveEndeavourItemLink(index, link)?.frontmatter)
  if (!slot) return { ok: false, reason: 'not_equippable', name: itemName(index, link) }
  if (slot === 'weapon') {
    const stackSize = stackSizeOf(index, link)
    const { entries, position } = addWeapon(character.attack_entries ?? [], link, stackSize ? (charges ?? stackSize) : undefined, stackSize)
    return { ok: true, change: { attack_entries: entries, containers, first: 'character' }, equipped: { slot: 'weapon', position } }
  }

  /** Stows what was worn in the slot before. */
  const swapOut = (previous: string | undefined): { ok: true; containers: EndeavourContainerSlotAssignment[] } | { ok: false; reason: PlaceFailure; name: string } => {
    if (!previous) return { ok: true, containers }
    const stowed = stowLink(containers, index, previous, stowInto)
    const fallback = stowed.ok || stowInto === undefined ? stowed : stowLink(containers, index, previous)
    return fallback.ok ? fallback : { ok: false, reason: fallback.reason, name: itemName(index, previous) }
  }

  if (slot === 'ring') {
    const rings = character.rings ?? []
    const target = ringPosition !== undefined && ringPosition >= 0 && ringPosition < MAX_RINGS ? ringPosition : undefined
    // A ring dropped on a worn ring swaps it; otherwise it takes the next free finger, or swaps out
    // the targeted (else the first) ring once both are taken.
    const position = target !== undefined && target < rings.length ? target : rings.length < MAX_RINGS ? rings.length : (target ?? 0)
    const swapped = swapOut(rings[position])
    if (!swapped.ok) return swapped
    const next = [...rings]
    next[position] = link
    return { ok: true, change: { rings: next, containers: swapped.containers, first: 'character' }, equipped: { slot: 'ring', position } }
  }

  const swapped = swapOut(character[slot])
  if (!swapped.ok) return swapped
  return { ok: true, change: { [slot]: link, containers: swapped.containers, first: 'character' }, equipped: { slot } }
}

/** Equips the item placed at `items[linkIndex]` of container `containerIndex` (a ring onto ring slot
 * `ringPosition` when it was dropped on one). A stack moves whole, with its remaining charges; a
 * temporary item has no stats to equip. */
export function equipFromInventory(
  character: CharacterFrontmatter,
  index: VaultIndex,
  containerIndex: number,
  linkIndex: number,
  ringPosition?: number,
): EquipResult {
  const containers = character.endeavour_inventory?.containers ?? []
  const entry = containers[containerIndex]?.items[linkIndex]
  if (entry === undefined || isCustomEntry(entry)) return { ok: false, reason: 'not_equippable', name: entry && isCustomEntry(entry) ? entry.name : undefined }

  const without = containers.map((c, i) => (i !== containerIndex ? c : { ...c, items: c.items.filter((_, j) => j !== linkIndex) }))
  return isStackEntry(entry)
    ? equipLink(character, index, without, entry.link, containerIndex, entry.charges, ringPosition)
    : equipLink(character, index, without, entry, containerIndex, undefined, ringPosition)
}

/** Equips an item straight from the vault search, without it having been in the inventory first (a
 * stackable one as a full stack). */
export function equipNew(character: CharacterFrontmatter, index: VaultIndex, link: string, ringPosition?: number): EquipResult {
  return equipLink(character, index, character.endeavour_inventory?.containers ?? [], link, undefined, undefined, ringPosition)
}

/** Takes an equipped item off and stows it in the inventory (into `targetContainerIndex` when it was
 * dragged onto one) — a stack with all its charges. Fails, leaving it equipped, when there's no room. */
export function unequip(character: CharacterFrontmatter, index: VaultIndex, ref: EquippedRef, targetContainerIndex?: number): EquipResult {
  const link = equippedLink(character, ref)
  if (!link) return { ok: false, reason: 'not_equippable' }
  const raw = ref.slot === 'weapon' ? character.attack_entries?.[ref.position] : undefined
  const count = isEquippedStack(raw) ? raw.charges : 1
  const stowed = stowLink(character.endeavour_inventory?.containers ?? [], index, link, targetContainerIndex, count)
  if (!stowed.ok) return { ok: false, reason: stowed.reason, name: itemName(index, link) }

  const fields =
    ref.slot === 'weapon'
      ? { attack_entries: (character.attack_entries ?? []).filter((_, i) => i !== ref.position) }
      : ref.slot === 'ring'
        ? { rings: (character.rings ?? []).filter((_, i) => i !== ref.position) }
        : { [ref.slot]: null }
  return { ok: true, change: { ...fields, containers: stowed.containers, first: 'inventory' } }
}

/** Sets the remaining charges of an equipped weapon stack, clamped to `[0, Stapelgroesse]` — at 0
 * the stack is removed from the attacks. `undefined` when the ref isn't a stack or nothing changes. */
export function setEquippedCharges(character: CharacterFrontmatter, index: VaultIndex, position: number, charges: number): EquipmentChange | undefined {
  const entries = character.attack_entries ?? []
  const entry = entries[position]
  if (!isEquippedStack(entry)) return undefined
  const max = stackSizeOf(index, entry.link) ?? entry.charges
  const clamped = Math.max(0, Math.min(max, Math.round(charges)))
  if (clamped === entry.charges) return undefined
  // The last knife thrown: an empty stack is gone, not kept as a husk.
  if (clamped === 0) return { attack_entries: entries.filter((_, i) => i !== position), first: 'character' }
  return { attack_entries: entries.map((e, i) => (i === position ? { ...entry, charges: clamped } : e)), first: 'character' }
}
