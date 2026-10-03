import type OBRType from '@owlbear-rodeo/sdk'
import { onCharacterEdit, useVaultStore } from '../store/vaultStore'
import type { CharacterFrontmatter } from '../vault/types'
import { LINK_KEY, readRoster, samePools, vitalsOf, type LiveRoster, type Vitals } from './live'
import { useOwlbearStore } from './owlbearStore'
import { stamp, writeRoster } from './roster'

/**
 * Keeps the room's live values (see `live.ts`) and this browser's vault in step:
 *
 * - an edit on a sheet goes to the room, so everyone sees it at once;
 * - a change that arrives from the room is saved to the vault, but only for the characters this
 *   player claimed — the player alone looks after their character's file, never the GM.
 */

type Obr = typeof OBRType
let obr: Obr | null = null

/** Characters whose room values are being saved to the vault right now. Their edits (and a rollback,
 * should the write fail) mustn't echo back into the room and overwrite the newer value there. */
const savingFromRoom = new Set<string>()

export function startLiveSync(OBR: Obr) {
  if (obr) return
  obr = OBR
  void OBR.room.getMetadata().then((metadata) => receive(readRoster(metadata), false))
  OBR.room.onMetadataChange((metadata) => receive(readRoster(metadata), true))
  onCharacterEdit((_path, character) => {
    if (!savingFromRoom.has(character.name)) void share(character)
  })
}

/**
 * Takes in the room's roster. Only changes that happen while this companion is open are saved
 * on their own: a roster found on opening may be older than the vault (edited between sessions),
 * so the sheet asks instead (see `OwlbearSheetBar`).
 */
function receive(roster: LiveRoster, isChange: boolean) {
  const { roster: previous, claimed, connectionId } = useOwlbearStore.getState()
  useOwlbearStore.setState({ roster })
  if (!isChange) return
  for (const name of claimed) {
    const entry = roster[name]
    if (entry && entry.by !== connectionId && entry.at !== previous[name]?.at) void saveToVault(name)
  }
}

/** Shares a sheet edit of a linked character with the room. */
async function share(character: CharacterFrontmatter) {
  const entry = useOwlbearStore.getState().roster[character.name]
  if (!entry) return
  const vitals = vitalsOf(character)
  if (samePools(vitals, entry) && vitals.ac === entry.ac && vitals.hpMax === entry.hpMax) return
  await pushVitals(character.name, vitals)
}

async function changeRoster(change: (roster: LiveRoster) => LiveRoster) {
  if (obr) useOwlbearStore.setState({ roster: await writeRoster(obr, change) })
}

/** Puts `vitals` into the room as the current values of `name`. */
export function pushVitals(name: string, vitals: Vitals): Promise<void> {
  const { connectionId, playerName } = useOwlbearStore.getState()
  return changeRoster((roster) => ({ ...roster, [name]: stamp(vitals, connectionId ?? '', playerName ?? '') }))
}

/** Drops `name` from the room; its tokens stay linked, but show nothing live until linked again. */
export function removeVitals(name: string): Promise<void> {
  return changeRoster(({ [name]: _removed, ...rest }) => rest)
}

/** Saves the room's values of `name` to this browser's vault — a no-op without edit permission. */
export async function saveToVault(name: string): Promise<void> {
  const entry = useOwlbearStore.getState().roster[name]
  const { vault, updateCharacterField } = useVaultStore.getState()
  const file = vault.characters.find((c) => c.frontmatter.name === name)
  if (!entry || !file) return
  const { hp, resilience, _write: targets } = file.frontmatter

  savingFromRoom.add(name)
  try {
    if (hp.current !== entry.hp) {
      await updateCharacterField(file.path, targets?.hp_current, entry.hp, (c) => ({ ...c, hp: { ...c.hp, current: entry.hp } }))
    }
    if ((hp.temp ?? 0) !== entry.temp) {
      await updateCharacterField(file.path, targets?.hp_temp, entry.temp, (c) => ({ ...c, hp: { ...c.hp, temp: entry.temp } }))
    }
    const liveResilience = entry.resilience
    if (resilience && liveResilience !== undefined && resilience.current !== liveResilience) {
      await updateCharacterField(file.path, targets?.resilience_current, liveResilience, (c) =>
        c.resilience ? { ...c, resilience: { ...c.resilience, current: liveResilience } } : c,
      )
    }
  } finally {
    savingFromRoom.delete(name)
  }
}

/**
 * Links a token on the map to a character. The room gets the character's values from this vault,
 * unless it already has live values for it (from another token, or earlier in the session). A token
 * in Clash then takes those values over (see `clashBridge.ts`).
 */
export async function linkToken(itemId: string, character: CharacterFrontmatter): Promise<void> {
  if (!obr) return
  await obr.scene.items.updateItems([itemId], (items) => {
    for (const item of items) item.metadata[LINK_KEY] = { character: character.name }
  })
  if (!useOwlbearStore.getState().roster[character.name]) await pushVitals(character.name, vitalsOf(character))
}

export async function unlinkToken(itemId: string): Promise<void> {
  if (!obr) return
  await obr.scene.items.updateItems([itemId], (items) => {
    for (const item of items) delete item.metadata[LINK_KEY]
  })
}
