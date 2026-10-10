import type OBRType from '@owlbear-rodeo/sdk'

type Obr = typeof OBRType

/**
 * Loot the GM hands out in Owlbear Rodeo. It waits in the room until the player who claimed the
 * character takes it into their vault (see `liveSync.ts`) — the GM never writes a player's file.
 */
export const LOOT_KEY = 'dnd-companion/loot'

export interface LootDrop {
  id: string
  /** The character who gets it. */
  character: string
  /** Name of the item — a vault item note's name, or a temporary item's. */
  name: string
  /** Slots of a temporary item (`EndeavourCustomItem.plaetze`); absent for an item note, whose own size counts. */
  plaetze?: number
  /** Name of the GM who handed it out. */
  from: string
  at: number
}

function isLootDrop(value: unknown): value is LootDrop {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.character === 'string' &&
    typeof v.name === 'string' &&
    (v.plaetze === undefined || typeof v.plaetze === 'number') &&
    typeof v.at === 'number'
  )
}

export function readLoot(metadata: Record<string, unknown>): LootDrop[] {
  const raw = metadata[LOOT_KEY]
  return Array.isArray(raw) ? raw.filter(isLootDrop) : []
}

/** Changes the room's pending loot, read right before writing (see `writeRoster`). */
export async function writeLoot(obr: Obr, change: (loot: LootDrop[]) => LootDrop[]): Promise<LootDrop[]> {
  const loot = change(readLoot(await obr.room.getMetadata()))
  await obr.room.setMetadata({ [LOOT_KEY]: loot })
  return loot
}
