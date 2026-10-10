import type OBRType from '@owlbear-rodeo/sdk'
import { activeConditions, sameConditions } from '../rules/conditions'
import { onCharacterEdit, useVaultStore } from '../store/vaultStore'
import type { CharacterFrontmatter } from '../vault/types'
import { renameInClash } from './clash'
import { LINK_KEY, readLink, readRoster, sameVitals, vitalsOf, type LiveRoster, type Vitals } from './live'
import type { PoolChange } from './liveEdit'
import { readLoot, writeLoot, type LootDrop } from './loot'
import { withLoot } from './lootInventory'
import { useOwlbearStore } from './owlbearStore'
import { stamp, writeRoster } from './roster'
import { readTable, writeTable, type Initiative, type TableState } from './table'

/**
 * Keeps the room's live values (see `live.ts`) and this browser's vault in step:
 *
 * - an edit on a sheet goes to the room, so everyone sees it at once;
 * - a change that arrives from the room is saved to the vault, but only for the characters this
 *   player claimed — the player alone looks after their character's file, never the GM;
 * - loot the GM hands out goes into a claimed character's inventory the same way;
 * - so do conditions (see `table.ts`): a character entering the room brings those of its file along.
 *
 * Initiative lives in the room only.
 */

type Obr = typeof OBRType
let obr: Obr | null = null

/** Characters whose room values are being saved to the vault right now. Their edits (and a rollback,
 * should the write fail) mustn't echo back into the room and overwrite the newer value there. */
const savingFromRoom = new Set<string>()

export function startLiveSync(OBR: Obr) {
  if (obr) return
  obr = OBR
  const take = (metadata: Record<string, unknown>, isChange: boolean) => {
    const previousTable = useOwlbearStore.getState().table
    const table = readTable(metadata)
    useOwlbearStore.setState({ table, loot: readLoot(metadata) })
    // Conditions someone else changed while this companion is open go to the claimed characters' files.
    if (isChange) {
      for (const name of useOwlbearStore.getState().claimed) {
        const next = table[name]?.conditions ?? []
        if (!sameConditions(previousTable[name]?.conditions ?? [], next)) void saveConditions(name, next)
      }
    }
    receive(readRoster(metadata), isChange)
    rosterLoaded = true
    void takeLoot()
    void addLinkedCharacters()
  }
  void OBR.room.getMetadata().then((metadata) => take(metadata, false))
  OBR.room.onMetadataChange((metadata) => take(metadata, true))
  onCharacterEdit((_path, character) => {
    if (!savingFromRoom.has(character.name)) void share(character)
  })
  // Loot waits until this player may write their vault, and has it open.
  useVaultStore.subscribe((state, previous) => {
    if (state.editPermission !== previous.editPermission || state.vault !== previous.vault) void takeLoot()
    if (state.vault !== previous.vault) void addLinkedCharacters()
  })
  OBR.scene.onReadyChange(() => void addLinkedCharacters())
  OBR.scene.items.onChange(() => void addLinkedCharacters())
  useOwlbearStore.subscribe((state, previous) => {
    if (state.claimed !== previous.claimed) void takeLoot()
    if (state.role !== previous.role) void addLinkedCharacters()
  })
}

/** Set once the room's roster was read — before that, every linked character would look missing. */
let rosterLoaded = false
/** Characters being added right now, so a burst of item changes adds each only once. */
const adding = new Set<string>()

/**
 * The GM's companion puts every character linked to a token in the scene into the room — also one
 * linked in an earlier session whose live values are gone — with the values of this vault.
 */
async function addLinkedCharacters() {
  if (!obr || !rosterLoaded || useOwlbearStore.getState().role !== 'GM') return
  try {
    if (!(await obr.scene.isReady())) return
    const tokens = await obr.scene.items.getItems((item) => readLink(item.metadata) !== undefined)
    const { roster } = useOwlbearStore.getState()
    const { characters } = useVaultStore.getState().vault
    for (const name of new Set(tokens.map((token) => readLink(token.metadata)!.character))) {
      const file = characters.find((c) => c.frontmatter.name === name)
      if (roster[name] || !file || adding.has(name)) continue
      adding.add(name)
      void pushVitals(name, vitalsOf(file.frontmatter))
        .then(() => seedConditions(file.frontmatter))
        .finally(() => adding.delete(name))
    }
  } catch {
    // The scene closed meanwhile — the next change looks again.
  }
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
  if (sameVitals(vitals, entry)) return
  await pushVitals(character.name, vitals)
}

async function changeRoster(change: (roster: LiveRoster) => LiveRoster) {
  if (obr) useOwlbearStore.setState({ roster: await writeRoster(obr, change) })
}

/** Puts `vitals` into the room as the current values of `name`. */
export function pushVitals(name: string, vitals: Vitals): Promise<void> {
  const { connectionId, playerName, roster } = useOwlbearStore.getState()
  const entry = stamp(vitals, connectionId ?? '', playerName ?? '')
  // Shown at once, in the same render as the sheet edit: waiting for the room would flash the
  // sheet bar's "room and vault differ" for a moment.
  useOwlbearStore.setState({ roster: { ...roster, [name]: entry } })
  return changeRoster((current) => ({ ...current, [name]: entry }))
}

/** Changes some of the live pools of `name` in the room, leaving the vault alone (the GM's edits). */
export function changePools(name: string, change: PoolChange): Promise<void> {
  const entry = useOwlbearStore.getState().roster[name]
  return entry ? pushVitals(name, { ...entry, ...change }) : Promise.resolve()
}

/** Drops `name` from the room and unlinks its tokens — a linked token would bring it right back
 * (see `addLinkedCharacters`). */
export async function removeVitals(name: string): Promise<void> {
  if (obr && (await obr.scene.isReady())) {
    const tokens = await obr.scene.items.getItems((item) => readLink(item.metadata)?.character === name)
    if (tokens.length > 0) {
      await obr.scene.items.updateItems(
        tokens.map((token) => token.id),
        (items) => {
          for (const item of items) delete item.metadata[LINK_KEY]
        },
      )
    }
  }
  await changeRoster(({ [name]: _removed, ...rest }) => rest)
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
 * Links a token on the map to a character and names it after them — in Owlbear, in Clash, and on the
 * label the token shows on the map (none is added). The room gets the character's values from this
 * vault, unless it already has live values for it (from another token, or earlier in the session).
 * A token in Clash then takes those values over (see `clashBridge.ts`).
 */
export async function linkToken(itemId: string, character: CharacterFrontmatter): Promise<void> {
  if (!obr) return
  await obr.scene.items.updateItems([itemId], (items) => {
    for (const item of items) {
      item.metadata[LINK_KEY] = { character: character.name }
      item.name = character.name
      renameInClash(item.metadata, character.name)
      const label = (item as { text?: { plainText: string } }).text
      if (label?.plainText) label.plainText = character.name
    }
  })
  if (!useOwlbearStore.getState().roster[character.name]) {
    await pushVitals(character.name, vitalsOf(character))
    await seedConditions(character)
  }
}

export async function unlinkToken(itemId: string): Promise<void> {
  if (!obr) return
  await obr.scene.items.updateItems([itemId], (items) => {
    for (const item of items) delete item.metadata[LINK_KEY]
  })
}

async function changeTable(change: (table: TableState) => TableState) {
  if (obr) useOwlbearStore.setState({ table: await writeTable(obr, change) })
}

/** Sets the conditions of `name` in the room — and in the vault, where this player claimed the character. */
export async function setConditions(name: string, conditions: string[]): Promise<void> {
  await changeTable((table) => ({ ...table, [name]: { ...table[name], conditions } }))
  if (useOwlbearStore.getState().claimed.includes(name)) await saveConditions(name, conditions)
}

/** Saves the conditions of `name` to this browser's vault — a no-op without edit permission or where they're the same. */
async function saveConditions(name: string, conditions: string[]): Promise<void> {
  const { vault, setConditions: write } = useVaultStore.getState()
  const file = vault.characters.find((c) => c.frontmatter.name === name)
  if (file && !sameConditions(activeConditions(file.frontmatter), conditions)) await write(file.path, conditions)
}

/** A character entering the room brings the conditions of its file along, unless the room already has some. */
async function seedConditions(character: CharacterFrontmatter): Promise<void> {
  const conditions = activeConditions(character)
  if (conditions.length === 0 || (useOwlbearStore.getState().table[character.name]?.conditions?.length ?? 0) > 0) return
  await changeTable((table) => ({ ...table, [character.name]: { ...table[character.name], conditions } }))
}

/** Records an initiative roll of `name`: the turn order roll, or (Endeavour) the action roll with its AP. */
export function recordInitiative(name: string, roll: Omit<Initiative, 'at'>): Promise<void> {
  return changeTable((table) => ({ ...table, [name]: { ...table[name], initiative: { ...table[name]?.initiative, ...roll, at: Date.now() } } }))
}

/** Clears everyone's initiative — a new fight begins. */
export function clearInitiative(): Promise<void> {
  return changeTable((table) => Object.fromEntries(Object.entries(table).map(([name, { initiative: _cleared, ...rest }]) => [name, rest])))
}

async function changeLoot(change: (loot: LootDrop[]) => LootDrop[]) {
  if (obr) useOwlbearStore.setState({ loot: await writeLoot(obr, change) })
}

/** Hands `name` an item; it waits in the room until their player's companion takes it (see `takeLoot`). */
export function sendLoot(drop: Omit<LootDrop, 'id' | 'from' | 'at'>): Promise<void> {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return changeLoot((loot) => [...loot, { ...drop, id, from: useOwlbearStore.getState().playerName ?? '', at: Date.now() }])
}

export function cancelLoot(id: string): Promise<void> {
  return changeLoot((loot) => loot.filter((drop) => drop.id !== id))
}

/** Loot being put into an inventory right now — not to be taken twice while the room catches up. */
const taking = new Set<string>()

/** Puts the loot waiting for this player's claimed characters into their inventories, then clears it from the room. */
async function takeLoot() {
  const { loot, claimed } = useOwlbearStore.getState()
  const { vault, editPermission, setEndeavourInventory, setInventory } = useVaultStore.getState()
  if (editPermission !== 'granted') return
  for (const drop of loot) {
    if (!claimed.includes(drop.character) || taking.has(drop.id)) continue
    const file = vault.characters.find((c) => c.frontmatter.name === drop.character)
    const change = file && withLoot(file.frontmatter, vault, drop)
    if (!file || !change) continue
    taking.add(drop.id)
    try {
      if (change.kind === 'containers') await setEndeavourInventory(file.path, change.containers)
      else await setInventory(file.path, change.inventory)
      await changeLoot((current) => current.filter((d) => d.id !== drop.id))
      void obr?.notification.show(`🎁 ${drop.character}: ${drop.name}`, 'SUCCESS')
    } finally {
      taking.delete(drop.id)
    }
  }
}
