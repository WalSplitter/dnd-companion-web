/** The characters this browser looks after in Owlbear Rodeo (see `owlbearStore.ts`), as stored. */
export const CLAIMS_KEY = 'dnd-companion-owlbear-claims'

export function loadClaims(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CLAIMS_KEY) ?? '[]')
    return Array.isArray(stored) ? stored.filter((name): name is string => typeof name === 'string') : []
  } catch {
    return []
  }
}
