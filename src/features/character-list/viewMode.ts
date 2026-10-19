import { useState } from 'react'
import { readStored, writeStored } from '../../utils/storage'

export type CharacterViewMode = 'auto' | 'cards' | 'list' | 'lineup'
export type CharacterLayout = Exclude<CharacterViewMode, 'auto'>

/** From this many characters `auto` switches from cards to list rows: up to four cards still fit in
 * two rows on a laptop, five or more would push part of the party below the fold. */
export const AUTO_LIST_FROM = 5

const STORAGE_KEY = 'dnd-companion-character-view'
const MODES: CharacterViewMode[] = ['auto', 'cards', 'list', 'lineup']

export function resolveLayout(mode: CharacterViewMode, count: number): CharacterLayout {
  if (mode !== 'auto') return mode
  return count >= AUTO_LIST_FROM ? 'list' : 'cards'
}

function readStoredMode(): CharacterViewMode {
  const stored = readStored(STORAGE_KEY)
  return MODES.includes(stored as CharacterViewMode) ? (stored as CharacterViewMode) : 'auto'
}

/** The chosen view mode, remembered per device: a DM's laptop and a player's phone may want different ones. */
export function useCharacterViewMode(): [CharacterViewMode, (mode: CharacterViewMode) => void] {
  const [mode, setModeState] = useState(readStoredMode)
  const setMode = (next: CharacterViewMode) => {
    setModeState(next)
    writeStored(STORAGE_KEY, next)
  }
  return [mode, setMode]
}
