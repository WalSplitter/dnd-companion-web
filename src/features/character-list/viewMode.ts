import { useState } from 'react'

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
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return MODES.includes(stored as CharacterViewMode) ? (stored as CharacterViewMode) : 'auto'
  } catch {
    // localStorage unavailable (private mode, ...) — the default works without it.
    return 'auto'
  }
}

/** The chosen view mode, remembered per device: a DM's laptop and a player's phone may want different ones. */
export function useCharacterViewMode(): [CharacterViewMode, (mode: CharacterViewMode) => void] {
  const [mode, setModeState] = useState(readStoredMode)
  const setMode = (next: CharacterViewMode) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not persisted — still applies for this visit.
    }
  }
  return [mode, setMode]
}
