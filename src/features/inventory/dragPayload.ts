import { isWornSlot, type EquippedRef } from './equipment'

/**
 * What an inventory drag carries in its `text/plain` `dataTransfer` slot. Every drag source sets one
 * of these as JSON (see `encodeDragPayload`); each drop target reads back only the kinds it accepts.
 *
 * Slot-grid inventory (`EndeavourInventoryGrid`):
 * - `new`: a search result — just the item's wikilink.
 * - `move`: a tile dragged out of a container (`ItemTile`).
 * - `equipped`: an item dragged off the loadout (`EquipmentLoadout`), which takes it off and stows it.
 *
 * List inventory (`InventoryPanel`):
 * - `list-new`: a search result.
 * - `list-move`: an item dragged from one list to the other (`ItemList`).
 */
export interface NewItemPayload {
  type: 'new'
  link: string
}

export interface MoveTilePayload {
  type: 'move'
  sourceContainerIndex: number
  sourceLinkIndex: number
}

export interface EquippedDragPayload {
  type: 'equipped'
  ref: EquippedRef
}

export type GridDropPayload = NewItemPayload | MoveTilePayload | EquippedDragPayload

export interface ListNewPayload {
  type: 'list-new'
  link: string
}

export interface ListMovePayload {
  type: 'list-move'
  section: 'equipped' | 'carried'
  position: number
}

export type ListDropPayload = ListNewPayload | ListMovePayload

export function encodeDragPayload(payload: GridDropPayload | ListDropPayload): string {
  return JSON.stringify(payload)
}

function parseJsonRecord(raw: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

function parseEquippedRef(raw: unknown): EquippedRef | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const ref = raw as Record<string, unknown>
  if (isWornSlot(ref.slot)) return { slot: ref.slot }
  return (ref.slot === 'weapon' || ref.slot === 'ring') && typeof ref.position === 'number' ? { slot: ref.slot, position: ref.position } : undefined
}

/** A drop on the slot grid or the loadout. Anything unrecognized — not JSON, or a shape no drag
 * source in this feature sets — is read as a plain wikilink rather than crashing the handler. */
export function parseGridDrop(raw: string): GridDropPayload {
  const p = parseJsonRecord(raw)
  if (p) {
    if (p.type === 'move' && typeof p.sourceContainerIndex === 'number' && typeof p.sourceLinkIndex === 'number') {
      return { type: 'move', sourceContainerIndex: p.sourceContainerIndex, sourceLinkIndex: p.sourceLinkIndex }
    }
    if (p.type === 'new' && typeof p.link === 'string') return { type: 'new', link: p.link }
    const ref = p.type === 'equipped' ? parseEquippedRef(p.ref) : undefined
    if (ref) return { type: 'equipped', ref }
  }
  return { type: 'new', link: raw }
}

/** A drop on one of the list inventory's lists; undefined for anything that isn't a list drag. */
export function parseListDrop(raw: string): ListDropPayload | undefined {
  const p = parseJsonRecord(raw)
  if (!p) return undefined
  if (p.type === 'list-new' && typeof p.link === 'string') return { type: 'list-new', link: p.link }
  if (p.type === 'list-move' && (p.section === 'equipped' || p.section === 'carried') && typeof p.position === 'number') {
    return { type: 'list-move', section: p.section, position: p.position }
  }
  return undefined
}
