import { createContext, useContext } from 'react'
import { getObr, useOwlbearStore } from './owlbearStore'
import { ROLL_CHANNEL, type SharedRoll } from './rollMessage'
import type { Initiative } from './table'

/** Name of the character whose sheet is shown — set by the sheet page in Owlbear while it's linked. */
export const RollSourceContext = createContext<string | null>(null)

export type RollToShare = Omit<SharedRoll, 'character' | 'player' | 'hidden'> & {
  /** An initiative roll: it goes to the room's initiative as well (see `table.ts`). */
  initiative?: Omit<Initiative, 'at'>
}

/**
 * Sends a roll to the room — to everyone, or to the GM only, as the player chose — and enters an
 * initiative roll at the table even while rolls aren't shown. Undefined outside a linked character's sheet.
 */
export function useShareRoll(): ((roll: RollToShare) => void) | undefined {
  const character = useContext(RollSourceContext)
  const visibility = useOwlbearStore((s) => s.rollVisibility)
  if (!character) return undefined
  return ({ initiative, ...roll }) => {
    const obr = getObr()
    if (!obr) return
    if (initiative) void import('./liveSync').then(({ recordInitiative }) => recordInitiative(character, initiative))
    if (visibility === 'off') return
    const player = useOwlbearStore.getState().playerName ?? ''
    const message: SharedRoll = { ...roll, character, player, ...(visibility === 'gm' ? { hidden: true } : {}) }
    void obr.broadcast.sendMessage(ROLL_CHANNEL, message, { destination: 'ALL' }).catch(() => {
      // Too large or the room went away — the roll still shows on the sheet.
    })
  }
}
