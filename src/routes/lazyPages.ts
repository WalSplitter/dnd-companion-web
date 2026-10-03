import { lazy } from 'react'

const loadCharacterList = () => import('./CharacterListPage')
// The sheet (with inventory, spells, markdown rendering) is the heavy part.
const loadCharacterSheet = () => import('./CharacterSheetPage')

/** The vault pages, split off the start page's bundle: a first visit only needs the start page. */
export const CharacterListPage = lazy(() => loadCharacterList().then((m) => ({ default: m.CharacterListPage })))
export const CharacterSheetPage = lazy(() => loadCharacterSheet().then((m) => ({ default: m.CharacterSheetPage })))

/** Downloads the vault pages in the background, so opening a vault from the start page never waits on them. */
export function preloadVaultPages(): void {
  void Promise.all([loadCharacterList(), loadCharacterSheet()]).catch(() => {
    // Only a head start — the route's own lazy import retries and surfaces a real failure.
  })
}
