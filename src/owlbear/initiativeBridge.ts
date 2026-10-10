import type OBRType from '@owlbear-rodeo/sdk'
import type { Item } from '@owlbear-rodeo/sdk'
import { readLink } from './live'
import { readTable, type TableState } from './table'

type Obr = typeof OBRType

/** Owlbear Rodeo's own initiative tracker: `{ count: string, active: boolean }` on every token in it. */
export const OWLBEAR_INITIATIVE_KEY = 'rodeo.owlbear.initiative-tracker/metadata'
/** Clash keeps its values under this prefix (see `clash.ts`); its initiative key isn't documented. */
const CLASH_PREFIX = 'com.battle-system.clash/'

/**
 * Writes an initiative (the turn order roll) into the trackers on a token's metadata — only into
 * trackers the token is already in: Owlbear's initiative tracker, and Clash where its initiative
 * field is there. Returns whether anything changed.
 */
export function writeInitiative(metadata: Record<string, unknown>, order: number): boolean {
  let changed = false
  const tracker = metadata[OWLBEAR_INITIATIVE_KEY] as { count?: unknown } | undefined
  if (tracker && typeof tracker === 'object' && tracker.count !== String(order)) {
    metadata[OWLBEAR_INITIATIVE_KEY] = { ...tracker, count: String(order) }
    changed = true
  }
  for (const key of Object.keys(metadata)) {
    if (!key.startsWith(CLASH_PREFIX) || !/initiative/i.test(key.slice(CLASH_PREFIX.length))) continue
    const previous = metadata[key]
    if (typeof previous !== 'number' && typeof previous !== 'string') continue
    const value = typeof previous === 'number' ? order : String(order)
    if (previous !== value) {
      metadata[key] = value
      changed = true
    }
  }
  return changed
}

/**
 * Puts a fresh initiative roll (see `table.ts`) onto the character's linked tokens. Only a roll made
 * since this page started counts — one found on loading may already have been changed by hand in the
 * tracker. Runs on everyone's background page; a player who may not change the tokens leaves it to the GM's.
 */
export function startInitiativeBridge(obr: Obr) {
  /** When each character's initiative was rolled, as last seen here. */
  const seen = new Map<string, number>()
  let loaded = false

  const apply = async (table: TableState) => {
    const fresh = new Map<string, number>()
    for (const [name, entry] of Object.entries(table)) {
      const at = entry.initiative?.at
      if (at === undefined) continue
      if (loaded && seen.get(name) !== at && entry.initiative?.order !== undefined) fresh.set(name, entry.initiative.order)
      seen.set(name, at)
    }
    loaded = true
    if (fresh.size === 0 || !(await obr.scene.isReady())) return
    const tokens = await obr.scene.items.getItems((item: Item) => {
      const link = readLink(item.metadata)
      return link !== undefined && fresh.has(link.character)
    })
    if (tokens.length === 0) return
    await obr.scene.items.updateItems(
      tokens.map((token) => token.id),
      (drafts) => {
        for (const draft of drafts) {
          const order = fresh.get(readLink(draft.metadata)?.character ?? '')
          if (order !== undefined) writeInitiative(draft.metadata, order)
        }
      },
    )
  }

  const onRoom = (metadata: Record<string, unknown>) =>
    void apply(readTable(metadata)).catch(() => {
      // This player may not change tokens, or the scene closed — the GM's bridge writes them.
    })
  void obr.room.getMetadata().then(onRoom)
  obr.room.onMetadataChange(onRoom)
}
