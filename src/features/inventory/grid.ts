import { resolveSlotCost, type EndeavourItemFrontmatter, type EndeavourItemSize } from '../../vault/adapters/endeavourItem'
import type { EndeavourContainerSlotAssignment, EndeavourCustomItem, EndeavourInventoryEntry, EndeavourStackEntry, VaultFile } from '../../vault/types'
import { resolveEndeavourItemLink, type VaultIndex } from '../../vault/wikilinks'

/** Fixed grid width for the slot-grid inventory UI, matching the DM's mockup (7 columns). */
export const GRID_COLUMNS = 7

/**
 * First-fit placement into a flat, row-major grid of `capacity` cells (`columns` wide): scans row by
 * row for the first contiguous run of `slotCost` free cells. Like word-wrap, an item that wouldn't
 * fully fit in the remainder of the current row moves to the start of the next row rather than
 * splitting across the boundary — the rules only define a scalar slot count per item, never a
 * width/height, so there's no "shape" to rotate or split. Returns the run's starting index, or
 * `null` if it fits nowhere (including when `slotCost` alone exceeds `columns`).
 */
export function findBestFit(occupied: boolean[], capacity: number, slotCost: number, columns = GRID_COLUMNS): number | null {
  if (slotCost <= 0 || slotCost > columns) return null

  for (let rowStart = 0; rowStart < capacity; rowStart += columns) {
    const rowEnd = Math.min(rowStart + columns, capacity)
    for (let start = rowStart; start + slotCost <= rowEnd; start++) {
      let fits = true
      for (let i = start; i < start + slotCost; i++) {
        if (occupied[i]) {
          fits = false
          break
        }
      }
      if (fits) return start
    }
  }
  return null
}

export interface ContainerTile {
  /** Index into the container's `items` list this tile was placed from — the stable handle for
   * removing/selecting it, since two tiles can point at the same item name. */
  linkIndex: number
  /** Selection identity — see `entryKey`. */
  key: string
  /** True for a player-created temporary item (`EndeavourCustomItem`) rather than a vault item. */
  custom: boolean
  item: VaultFile<EndeavourItemFrontmatter> | undefined
  start: number
  length: number
  /** Uses remaining, for a stackable/consumable item (`EndeavourStackEntry`) — `undefined` for every
   * other entry shape. */
  charges: number | undefined
}

export interface ContainerLayout {
  tiles: ContainerTile[]
  /** Entries that didn't fit within `capacity` — e.g. the list was edited elsewhere and now
   * overflows. Kept visible-but-unplaced rather than silently dropped. */
  overflow: { linkIndex: number; entry: EndeavourInventoryEntry; item: VaultFile<EndeavourItemFrontmatter> | undefined }[]
  used: number
  capacity: number
  /** Per-cell occupancy (length === `capacity`) — `true` for every cell a tile spans, including its
   * continuation cells, so a renderer can tell "covered by an earlier tile" apart from "free". */
  occupied: boolean[]
}

/** Resolves an item link to its slot cost, defaulting to 1 when the link is unresolved or the item
 * has no derivable size (keeps the grid from crashing on bad/edited-elsewhere data). */
function slotCostOf(item: VaultFile<EndeavourItemFrontmatter> | undefined): number {
  if (!item) return 1
  return resolveSlotCost(item.frontmatter) ?? 1
}

export function isCustomEntry(entry: EndeavourInventoryEntry): entry is EndeavourCustomItem {
  return typeof entry === 'object' && 'name' in entry
}

/** True for a placed stack of a consumable item that tracks remaining uses — see `EndeavourStackEntry`. */
export function isStackEntry(entry: EndeavourInventoryEntry): entry is EndeavourStackEntry {
  return typeof entry === 'object' && 'link' in entry
}

/** Stable identity of an entry for selection/highlighting: a vault item's own wikilink (a stack entry
 * keys the same as its plain wikilink — `charges` changing shouldn't change which tile is "selected"),
 * or a `custom:` key built from a temporary item's name + slot cost. */
export function entryKey(entry: EndeavourInventoryEntry): string {
  if (isCustomEntry(entry)) return `custom:${entry.name}|${entry.plaetze}`
  return isStackEntry(entry) ? entry.link : entry
}

/** Resolves an entry to an item file. A temporary item becomes a synthetic `equipment` file so
 * everything downstream (detail panel, size check against `MaxGroesse`, slot cost) treats it like
 * any other item without special-casing. Values come straight from character YAML, so they're
 * sanitized here rather than trusted. */
export function resolveEntry(index: VaultIndex, entry: EndeavourInventoryEntry): VaultFile<EndeavourItemFrontmatter> | undefined {
  if (isCustomEntry(entry)) {
    const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : '?'
    const plaetze = Number.isFinite(entry.plaetze) ? Math.max(1, Math.round(entry.plaetze)) : 1
    return { path: `custom:${name}`, frontmatter: { kind: 'equipment', name, plaetze }, body: '' }
  }
  return resolveEndeavourItemLink(index, isStackEntry(entry) ? entry.link : entry)
}

/** Lays out a container's `items` into its grid, in list order (first-fit, see `findBestFit`).
 * Pure — takes the resolved capacity so callers decide how it was derived. */
export function layoutContainer(entries: EndeavourInventoryEntry[], index: VaultIndex, capacity: number, columns = GRID_COLUMNS): ContainerLayout {
  const occupied = new Array<boolean>(capacity).fill(false)
  const tiles: ContainerTile[] = []
  const overflow: ContainerLayout['overflow'] = []

  entries.forEach((entry, linkIndex) => {
    const item = resolveEntry(index, entry)
    const length = Math.min(slotCostOf(item), columns)
    const start = findBestFit(occupied, capacity, length, columns)
    if (start === null) {
      overflow.push({ linkIndex, entry, item })
      return
    }
    for (let i = start; i < start + length; i++) occupied[i] = true
    tiles.push({
      linkIndex,
      key: entryKey(entry),
      custom: isCustomEntry(entry),
      item,
      start,
      length,
      charges: isStackEntry(entry) ? entry.charges : undefined,
    })
  })

  return { tiles, overflow, used: occupied.filter(Boolean).length, capacity, occupied }
}

/** A container item's own total slot capacity (its `Plaetze` is a capacity here, not a cost). */
export function containerCapacity(fm: EndeavourItemFrontmatter): number {
  return resolveSlotCost(fm) ?? 0
}

export interface ResolvedContainer {
  containerIndex: number
  assignment: EndeavourContainerSlotAssignment
  capacity: number
  maxSize: EndeavourItemSize | undefined
  /** Display name, numbered ("Gürteltasche 1", "Gürteltasche 2") when the same container is equipped more than once. */
  name: string
  layout: ContainerLayout
}

/** Resolves every equipped container to its capacity, size limit, display name and grid layout.
 * Duplicate container names get a running number so "Ablegen in"/quick-slot labels can tell them apart. */
export function resolveContainers(containers: EndeavourContainerSlotAssignment[], index: VaultIndex): ResolvedContainer[] {
  const base = containers.map((assignment, containerIndex) => {
    const fm = resolveEndeavourItemLink(index, assignment.container)?.frontmatter
    const capacity = fm ? containerCapacity(fm) : 0
    return {
      containerIndex,
      assignment,
      capacity,
      maxSize: fm?.kind === 'container' ? fm.max_size : undefined,
      baseName: fm?.name ?? assignment.container,
      layout: layoutContainer(assignment.items, index, capacity),
    }
  })

  const totals = new Map<string, number>()
  for (const r of base) totals.set(r.baseName, (totals.get(r.baseName) ?? 0) + 1)
  const running = new Map<string, number>()
  return base.map(({ baseName, ...r }) => {
    if ((totals.get(baseName) ?? 1) <= 1) return { ...r, name: baseName }
    const next = (running.get(baseName) ?? 0) + 1
    running.set(baseName, next)
    return { ...r, name: `${baseName} ${next}` }
  })
}
