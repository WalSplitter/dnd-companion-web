import { createContext } from 'react'
import type { Vitals } from './live'

export type PoolChange = Partial<Pick<Vitals, 'hp' | 'temp' | 'resilience'>>

/**
 * Set around the sheet of a character the GM looks at in Owlbear Rodeo: HP, temp HP and resilience
 * stay editable there, but go to the room only. The player who claimed the character saves them to
 * the vault (see `liveSync.ts`), so the GM never commits to a file someone else writes — the rest
 * of the sheet stays locked for them.
 */
export const LivePoolsEditContext = createContext<((change: PoolChange) => void) | null>(null)

/**
 * True around the sheet of a character linked in Owlbear Rodeo. Its conditions are the room's then,
 * shown and changed in the bar above the sheet (`OwlbearSheetBar`) — the sheet leaves them out.
 */
export const LiveCharacterContext = createContext(false)
