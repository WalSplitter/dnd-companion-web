import { createContext, useContext } from 'react'
import type { VaultIndex } from './wikilinks'

export const VaultIndexContext = createContext<VaultIndex | null>(null)

/** The `VaultIndex` for the character sheet currently on screen — provided once by `CharacterSheet`
 * so deeply nested body-text renderers (see `WikiLink`) can resolve `[[Wikilink]]`s without every
 * intermediate component threading the index through as a prop. */
export function useVaultIndex(): VaultIndex {
  const index = useContext(VaultIndexContext)
  if (!index) throw new Error('useVaultIndex must be used within a VaultIndexProvider')
  return index
}
