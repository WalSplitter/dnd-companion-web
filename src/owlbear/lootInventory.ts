import { resolveContainers, tryPlaceEntry } from '../features/inventory/grid'
import type { CharacterFrontmatter, EndeavourContainerSlotAssignment, EndeavourInventoryEntry, InventoryEntry, Vault } from '../vault/types'
import { buildVaultIndex } from '../vault/wikilinks'
import type { LootDrop } from './loot'

export type LootChange =
  | { kind: 'containers'; containers: EndeavourContainerSlotAssignment[] }
  | { kind: 'list'; inventory: NonNullable<CharacterFrontmatter['inventory']> }

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * The character's inventory with `drop` added — undefined where it has nowhere to go (no container
 * equipped, or no file to write the inventory to), so the loot keeps waiting in the room.
 *
 * An item note of that name goes in as a link (a stack with its full uses); anything else as a
 * temporary item (`EndeavourCustomItem`), which the GM later swaps for a real note. In the slot grid
 * it takes the first container it fits in — or, if it fits nowhere, the first one anyway, where the
 * inventory shows it as not placed rather than losing it.
 */
export function withLoot(character: CharacterFrontmatter, vault: Vault, drop: LootDrop): LootChange | undefined {
  const containers = character.endeavour_inventory?.containers
  if (containers && character._write?.endeavour_inventory) {
    if (containers.length === 0) return undefined
    const note = vault.endeavourItems.find((item) => sameName(item.frontmatter.name, drop.name))
    const link = note && `[[${note.frontmatter.name}]]`
    const stack = note?.frontmatter.stack_size
    const entry: EndeavourInventoryEntry = link ? (stack !== undefined && stack > 1 ? { link, charges: stack } : link) : { name: drop.name.trim(), plaetze: drop.plaetze ?? 1 }

    const index = buildVaultIndex(vault)
    const resolved = resolveContainers(containers, index)
    const fit = resolved.map((r) => ({ r, result: tryPlaceEntry(resolved, index, r.assignment.items, entry, r.containerIndex) })).find(({ result }) => result.ok)
    const target = fit?.r.containerIndex ?? 0
    return {
      kind: 'containers',
      containers: containers.map((assignment, i) => (i === target ? { ...assignment, items: [...assignment.items, entry] } : assignment)),
    }
  }

  if (!character._write?.inventory) return undefined
  const note = vault.items.find((item) => sameName(item.frontmatter.name, drop.name)) ?? vault.endeavourItems.find((item) => sameName(item.frontmatter.name, drop.name))
  const entry: InventoryEntry = note ? `[[${note.frontmatter.name}]]` : { name: drop.name.trim() }
  const inventory = character.inventory ?? {}
  return { kind: 'list', inventory: { ...inventory, carried: [...(inventory.carried ?? []), entry] } }
}
