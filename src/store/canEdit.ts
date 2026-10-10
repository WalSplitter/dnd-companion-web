import { createContext, useContext } from 'react'
import { useVaultStore } from './vaultStore'

/** True around a sheet that stays read-only whatever the vault allows — in Owlbear Rodeo, the
 * character of another player, who alone writes it back to the vault. */
export const SheetLockContext = createContext(false)

/** Whether vault edits are currently written back to disk (the user granted `readwrite` access), or —
 * for the sample vault — applied in memory only. False inside a `SheetLockContext`. */
export function useCanEdit(): boolean {
  const locked = useContext(SheetLockContext)
  const granted = useVaultStore((s) => s.editPermission === 'granted')
  return granted && !locked
}
