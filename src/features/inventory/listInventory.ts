import type { CharacterFrontmatter, InventoryEntry } from '../../vault/types'
import { wikilinkTarget } from '../../vault/wikilinkSyntax'

/**
 * Editing the own-schema list inventory: `inventory.equipped` (worn/at hand) and `inventory.carried`
 * (in the pack), each a list of `[[Item]]` wikilinks or inline `{ name, quantity, weight_lb }` items.
 * Unlike the slot-grid inventory there are no slots or sizes — items are just added, removed and moved
 * between the two lists. Every function is pure and returns the whole next inventory (for
 * `setInventory`), or `undefined` when nothing changes.
 */

export type InventorySection = 'equipped' | 'carried'

export type ListInventory = NonNullable<CharacterFrontmatter['inventory']>

export const INVENTORY_SECTIONS: readonly InventorySection[] = ['equipped', 'carried']

export function otherSection(section: InventorySection): InventorySection {
  return section === 'equipped' ? 'carried' : 'equipped'
}

function sameEntry(a: InventoryEntry, b: InventoryEntry): boolean {
  const key = (e: InventoryEntry) => (typeof e === 'string' ? wikilinkTarget(e) : e.name).trim().toLowerCase()
  return key(a) === key(b)
}

/** Whether `link` is already in `section` — the note carries its own quantity, so a vault item is
 * listed once per section. */
export function hasEntry(inventory: ListInventory | undefined, section: InventorySection, link: string): boolean {
  return (inventory?.[section] ?? []).some((e) => sameEntry(e, link))
}

/** Adds a vault item (`[[Name]]`) to the end of `section`; `undefined` when it's already there. */
export function addEntry(inventory: ListInventory | undefined, section: InventorySection, link: string): ListInventory | undefined {
  if (hasEntry(inventory, section, link)) return undefined
  return { ...inventory, [section]: [...(inventory?.[section] ?? []), link] }
}

/** Removes the entry at `position` of `section`. */
export function removeEntry(inventory: ListInventory | undefined, section: InventorySection, position: number): ListInventory | undefined {
  const list = inventory?.[section] ?? []
  if (position < 0 || position >= list.length) return undefined
  return { ...inventory, [section]: list.filter((_, i) => i !== position) }
}

/** Moves the entry at `position` of `from` to the end of the other list. A vault item already listed
 * there isn't duplicated — it just leaves `from`. */
export function moveEntry(inventory: ListInventory | undefined, from: InventorySection, position: number): ListInventory | undefined {
  const list = inventory?.[from] ?? []
  const entry = list[position]
  if (entry === undefined) return undefined
  const to = otherSection(from)
  const target = inventory?.[to] ?? []
  return {
    ...inventory,
    [from]: list.filter((_, i) => i !== position),
    [to]: target.some((e) => sameEntry(e, entry)) ? target : [...target, entry],
  }
}
