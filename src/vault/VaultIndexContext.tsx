import type { ReactNode } from 'react'
import { VaultIndexContext } from './useVaultIndex'
import type { VaultIndex } from './wikilinks'

export function VaultIndexProvider({ index, children }: { index: VaultIndex; children: ReactNode }) {
  return <VaultIndexContext.Provider value={index}>{children}</VaultIndexContext.Provider>
}
