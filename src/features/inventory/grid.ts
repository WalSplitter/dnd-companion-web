import { resolveSlotCost, type EndeavourItemFrontmatter } from '../../vault/adapters/endeavourItem'
import type { VaultFile } from '../../vault/types'
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
  /** Index into the container's `items` wikilink list this tile was placed from — the stable handle
   * for removing/selecting it, since two tiles can point at the same item name. */
  linkIndex: number
  link: string
  item: VaultFile<EndeavourItemFrontmatter> | undefined
  start: number
  length: number
}

export interface ContainerLayout {
  tiles: ContainerTile[]
  /** Entries that didn't fit within `capacity` — e.g. the list was edited elsewhere and now
   * overflows. Kept visible-but-unplaced rather than silently dropped. */
  overflow: { linkIndex: number; link: string; item: VaultFile<EndeavourItemFrontmatter> | undefined }[]
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

/** Lays out a container's `items` wikilinks into its grid, in list order (first-fit, see
 * `findBestFit`). Pure — takes the resolved capacity so callers decide how it was derived. */
export function layoutContainer(itemLinks: string[], index: VaultIndex, capacity: number, columns = GRID_COLUMNS): ContainerLayout {
  const occupied = new Array<boolean>(capacity).fill(false)
  const tiles: ContainerTile[] = []
  const overflow: ContainerLayout['overflow'] = []

  itemLinks.forEach((link, linkIndex) => {
    const item = resolveEndeavourItemLink(index, link)
    const length = Math.min(slotCostOf(item), columns)
    const start = findBestFit(occupied, capacity, length, columns)
    if (start === null) {
      overflow.push({ linkIndex, link, item })
      return
    }
    for (let i = start; i < start + length; i++) occupied[i] = true
    tiles.push({ linkIndex, link, item, start, length })
  })

  return { tiles, overflow, used: occupied.filter(Boolean).length, capacity, occupied }
}

/** A container item's own total slot capacity (its `Plaetze` is a capacity here, not a cost). */
export function containerCapacity(fm: EndeavourItemFrontmatter): number {
  return resolveSlotCost(fm) ?? 0
}
