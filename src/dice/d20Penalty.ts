import { createContext, useContext } from 'react'

/**
 * Flat amount subtracted from every d20 roll made below the provider — currently the exhaustion
 * penalty (rule `Erschöpfung#Beeinträchtigte W20-Prüfungen`, see `exhaustionD20Penalty`). A context
 * rather than a prop so every roll button on the sheet (attributes, saves, skills, initiative,
 * attacks, spell attacks) applies it without each caller having to remember to.
 */
export const D20PenaltyContext = createContext(0)

export function useD20Penalty(): number {
  return useContext(D20PenaltyContext)
}
