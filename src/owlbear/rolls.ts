import { createContext, useContext } from 'react'
import { getObr, useOwlbearStore } from './owlbearStore'
import { ROLL_CHANNEL, type SharedRoll } from './rollMessage'

/** Name of the character whose sheet is shown — set by the sheet page in Owlbear while it's linked. */
export const RollSourceContext = createContext<string | null>(null)

/** Sends a roll to the room — undefined outside a linked character's sheet, or when the player turned it off. */
export function useShareRoll(): ((roll: Omit<SharedRoll, 'character' | 'player'>) => void) | undefined {
  const character = useContext(RollSourceContext)
  const share = useOwlbearStore((s) => s.shareRolls)
  if (!character || !share) return undefined
  return (roll) => {
    const obr = getObr()
    if (!obr) return
    const player = useOwlbearStore.getState().playerName ?? ''
    void obr.broadcast.sendMessage(ROLL_CHANNEL, { ...roll, character, player } satisfies SharedRoll, { destination: 'ALL' }).catch(() => {
      // Too large or the room went away — the roll still shows on the sheet.
    })
  }
}
