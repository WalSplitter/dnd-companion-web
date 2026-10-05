import type OBRType from '@owlbear-rodeo/sdk'
import { create } from 'zustand'
import type { LiveRoster } from './live'

export type OwlbearRole = 'GM' | 'PLAYER'

interface OwlbearState {
  /** Set once Owlbear has answered: the SDK can be used from then on. */
  ready: boolean
  role: OwlbearRole | null
  playerName: string | null
  /** This browser's connection to the room — tells its own roster writes from everyone else's. */
  connectionId: string | null
  /** The room's live values per character (see `live.ts`). */
  roster: LiveRoster
  /** Characters this browser looks after: changes made in Owlbear are saved to their vault files here. */
  claimed: string[]
  /** Whether rolls on the sheets of linked characters go to the room (see `rolls.ts`). */
  shareRolls: boolean
}

const CLAIMS_KEY = 'dnd-companion-owlbear-claims'
const SHARE_ROLLS_KEY = 'dnd-companion-owlbear-share-rolls'

function loadClaims(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CLAIMS_KEY) ?? '[]')
    return Array.isArray(stored) ? stored.filter((name): name is string => typeof name === 'string') : []
  } catch {
    return []
  }
}

export const useOwlbearStore = create<OwlbearState>(() => ({
  ready: false,
  role: null,
  playerName: null,
  connectionId: null,
  roster: {},
  claimed: loadClaims(),
  shareRolls: loadShareRolls(),
}))

function loadShareRolls(): boolean {
  try {
    return localStorage.getItem(SHARE_ROLLS_KEY) !== 'false'
  } catch {
    return true
  }
}

export function setShareRolls(shareRolls: boolean) {
  useOwlbearStore.setState({ shareRolls })
  try {
    localStorage.setItem(SHARE_ROLLS_KEY, String(shareRolls))
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
