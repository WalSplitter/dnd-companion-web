import { createContext, useContext, type ReactNode } from 'react'
import type { VaultIndex } from './wikilinks'

const VaultIndexContext = createContext<VaultIndex | null>(null)

export function VaultIndexProvider({ index, children }: { index: VaultIndex; children: ReactNode }) {
  return <VaultIndexContext.Provider value={index}>{children}</VaultIndexContext.Provider>
}

/** The `VaultIndex` for the character sheet currently on screen — provided once by `CharacterSheet`
 * so deeply nested body-text renderers (see `WikiLink`) can resolve `[[Wikilink]]`s without every
 * intermediate component threading the index through as a prop. */
export function useVaultIndex(): VaultIndex {
  const index = useContext(VaultIndexContext)
  if (!index) throw new Error('useVaultIndex must be used within a VaultIndexProvider')
  return index
}
