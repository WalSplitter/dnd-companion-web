import type OBRType from '@owlbear-rodeo/sdk'
import { create } from 'zustand'
import { CLAIMS_KEY, loadClaims } from './claims'
import type { LiveRoster } from './live'
import type { LootDrop } from './loot'
import type { TableState } from './table'

export type OwlbearRole = 'GM' | 'PLAYER'

/** Who sees the rolls made on a linked character's sheet: everyone, the GM only, or no one. */
export type RollVisibility = 'all' | 'gm' | 'off'

interface OwlbearState {
  /** Set once Owlbear has answered: the SDK can be used from then on. */
  ready: boolean
  role: OwlbearRole | null
  playerName: string | null
  /** This browser's connection to the room — tells its own roster writes from everyone else's. */
  connectionId: string | null
  /** The room's live values per character (see `live.ts`). */
  roster: LiveRoster
  /** Conditions and initiative per character (see `table.ts`). */
  table: TableState
  /** Loot waiting for its character's player (see `loot.ts`). */
  loot: LootDrop[]
  /** Characters this browser looks after: changes made in Owlbear are saved to their vault files here. */
  claimed: string[]
  /** Where rolls on the sheets of linked characters go (see `rolls.ts`). */
  rollVisibility: RollVisibility
}

/** Held `'false'` while rolls could only be shown to everyone or no one. */
const ROLL_VISIBILITY_KEY = 'dnd-companion-owlbear-share-rolls'

export const useOwlbearStore = create<OwlbearState>(() => ({
  ready: false,
  role: null,
  playerName: null,
  connectionId: null,
  roster: {},
  table: {},
  loot: [],
  claimed: loadClaims(),
  rollVisibility: loadRollVisibility(),
}))

function loadRollVisibility(): RollVisibility {
  try {
    const stored = localStorage.getItem(ROLL_VISIBILITY_KEY)
    if (stored === 'false') return 'off'
    return stored === 'gm' || stored === 'off' ? stored : 'all'
  } catch {
    return 'all'
  }
}

export function setRollVisibility(rollVisibility: RollVisibility) {
  useOwlbearStore.setState({ rollVisibility })
  try {
    localStorage.setItem(ROLL_VISIBILITY_KEY, rollVisibility)
  } catch {
    // Not remembered beyond this visit then.
  }
}

/** Marks `name` as this player's own character, or stops doing so. */
export function setClaimed(name: string, claimed: boolean) {
  const others = useOwlbearStore.getState().claimed.filter((n) => n !== name)
  const next = claimed ? [...others, name] : others
  useOwlbearStore.setState({ claimed: next })
  try {
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(next))
  } catch {
    // Not remembered beyond this visit then.
  }
}

let obr: typeof OBRType | null = null

/** The SDK once `connectOwlbear` loaded it — kept here so the app's own chunks never import it statically. */
export function getObr(): typeof OBRType | null {
  return obr
}

/**
 * Loads the Owlbear SDK, follows the current player's role and name, and starts the live sync.
 * Must run before the first navigation: the SDK reads the room from the `obrref` query parameter
 * when it is imported.
 */
export async function connectOwlbear(): Promise<void> {
  const [{ default: OBR }, { startLiveSync }] = await Promise.all([import('@owlbear-rodeo/sdk'), import('./liveSync')])
  obr = OBR
  OBR.onReady(() => {
    void Promise.all([OBR.player.getRole(), OBR.player.getName(), OBR.player.getConnectionId()]).then(([role, playerName, connectionId]) => {
      useOwlbearStore.setState({ ready: true, role, playerName, connectionId })
      startLiveSync(OBR)
    })
    // The GM can hand their role to another player mid-session.
    OBR.player.onChange((player) => useOwlbearStore.setState({ role: player.role, playerName: player.name }))
  })
}
