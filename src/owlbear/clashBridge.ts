import type OBRType from '@owlbear-rodeo/sdk'
import type { Item } from '@owlbear-rodeo/sdk'
import { clashDiffers, readClash, writeClash, type ClashVitals } from './clash'
import { readLink, readRoster, type LiveRoster } from './live'
import { writeRoster } from './roster'

type Obr = typeof OBRType

/** Marks roster entries that came from Clash — never a connection, so every companion takes them in
 * as someone else's change (and the player's saves it to the vault). */
const CLASH_SOURCE = 'clash'

/**
 * Keeps Clash's values on linked tokens and the room's roster in step, in both directions:
 *
 * - HP or temp HP changed in Clash → into the roster, so the companions show (and the owner saves) it;
 * - a roster change (a sheet edit, linking a token) → onto the tokens in Clash: HP, temp HP, max HP, AC.
 *
 * Runs on everyone's background page, so it works while every companion is closed. Several bridges
 * may act on one change; the writes are idempotent, and a player whose role may not change tokens
 * simply leaves that to the GM's bridge. A token seen for the first time takes the roster's values:
 * that is how linking prefills Clash.
 */
export function startClashBridge(obr: Obr) {
  let roster: LiveRoster = {}
  let items: Item[] = []
  /** Clash HP and temp HP per token as last seen or written here — tells a change made in Clash from our own write. */
  const seen = new Map<string, Pick<ClashVitals, 'hp' | 'temp'>>()

  const linkedClashTokens = () =>
    items.flatMap((item) => {
      const link = readLink(item.metadata)
      const clash = readClash(item.metadata)
      return link && clash ? [{ item, name: link.character, clash }] : []
    })

  /** Writes the roster onto the Clash tokens that show something else — except for `skip`, just taken from Clash. */
  const mirror = async (skip = new Set<string>()) => {
    const stale = linkedClashTokens().filter(({ name, clash }) => !skip.has(name) && roster[name] && clashDiffers(clash, roster[name]))
    if (stale.length === 0) return
    try {
      await obr.scene.items.updateItems(
        stale.map(({ item }) => item.id),
        (drafts) => {
          for (const draft of drafts) {
            const link = readLink(draft.metadata)
            const entry = link && roster[link.character]
            if (entry) writeClash(draft.metadata, entry)
          }
        },
      )
      for (const { item, name, clash } of stale) seen.set(item.id, { hp: roster[name].hp, temp: clash.temp === undefined ? undefined : roster[name].temp })
    } catch {
      // This player may not change tokens; the GM's bridge writes them.
    }
  }

  const onItems = (next: Item[]) => {
    items = next
    const fromClash = new Set<string>()
    for (const { item, name, clash } of linkedClashTokens()) {
      const entry = roster[name]
      if (!entry) continue
      const before = seen.get(item.id)
      seen.set(item.id, { hp: clash.hp, temp: clash.temp })
      if (before === undefined) continue
      // Changed in Clash: HP and temp HP — max HP and AC belong to the sheet, resilience isn't in Clash.
      const hpChanged = before.hp !== clash.hp && clash.hp !== entry.hp
      const tempChanged = clash.temp !== undefined && before.temp !== undefined && before.temp !== clash.temp && clash.temp !== entry.temp
      if (!hpChanged && !tempChanged) continue
      const change = { ...(hpChanged ? { hp: clash.hp } : {}), ...(tempChanged ? { temp: clash.temp } : {}) }
      fromClash.add(name)
      roster = { ...roster, [name]: { ...entry, ...change } }
      void writeRoster(obr, (current) =>
        current[name] ? { ...current, [name]: { ...current[name], ...change, by: CLASH_SOURCE, byName: 'Clash', at: Date.now() } } : current,
      )
    }
    void mirror(fromClash)
  }

  const loadScene = async () => {
    if (await obr.scene.isReady()) {
      onItems(await obr.scene.items.getItems())
    } else {
      items = []
      seen.clear()
    }
  }

  void obr.room.getMetadata().then((metadata) => {
    roster = readRoster(metadata)
    void mirror()
  })
  obr.room.onMetadataChange((metadata) => {
    roster = readRoster(metadata)
    void mirror()
  })
  void loadScene()
  obr.scene.onReadyChange(() => void loadScene())
  obr.scene.items.onChange(onItems)
}
