import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { characterNameFromPath, characterRoute, PARTY_ROUTE } from '../routes/paths'
import { useVaultStore } from '../store/vaultStore'
import { questById, type Quest } from './questCatalog'
import { nextQuest } from './questProgress'
import { useQuestStore, type QuestPageKey } from './questStore'

/** Which quest page a route is, if any. */
export function questPageOf(pathname: string): QuestPageKey | null {
  if (pathname === '/') return 'start'
  if (pathname === PARTY_ROUTE) return 'party'
  if (characterNameFromPath(pathname) !== undefined) return 'sheet'
  return null
}

/** Whether a sheet quest can run on the sheet of a character who does (or doesn't) cast spells. */
export function fitsQuest(quest: Quest, casts: boolean): boolean {
  return quest.needs !== 'spells' || casts
}

/** The quest page the player is on, and its next open quest — on a sheet, one that suits the character. */
export function usePageQuest(): { page: QuestPageKey | null; quest: Quest | undefined } {
  const { pathname } = useLocation()
  const page = questPageOf(pathname)
  const name = characterNameFromPath(pathname)
  // Only what `fitsQuest` asks of the character, so edits to the vault don't re-render the caller.
  const casts = useVaultStore((s) => Boolean(s.vault.characters.find((c) => c.frontmatter.name === name)?.frontmatter.spellcasting))
  const completed = useQuestStore((s) => s.completed)
  const quest = useMemo(
    () => (page ? nextQuest(completed, page, (q) => page !== 'sheet' || fitsQuest(q, casts)) : undefined),
    [page, completed, casts],
  )
  return { page, quest }
}

/**
 * Starts a quest wherever the player is: goes to its page first — the party page fresh on its first
 * tab, or the sheet of a character it suits (the one open, else the one last visited, else the first
 * that fits). A quest beyond the start page with no vault open opens the sample vault, the arena.
 */
export function useStartQuest() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()

  return useCallback(
    async (questId: string) => {
      const quest = questById(questId)
      if (!quest) return
      const vault = useVaultStore.getState()
      if ((quest.page === 'party' || quest.page === 'sheet') && vault.source === 'none') {
        if (!(await vault.loadSampleVault())) return
      }

      if (quest.page === 'start' && pathname !== '/') navigate('/')
      if (quest.page === 'party' && (pathname !== PARTY_ROUTE || search)) navigate(PARTY_ROUTE)
      if (quest.page === 'sheet') {
        const characters = useVaultStore.getState().vault.characters.map((c) => c.frontmatter)
        const byName = (name: string | undefined) => characters.find((c) => c.name === name)
        const current = byName(characterNameFromPath(pathname))
        const pick = [current, byName(useQuestStore.getState().lastCharacter), ...characters].find((c) => c && fitsQuest(quest, Boolean(c.spellcasting)))
        if (pick && pick !== current) navigate(characterRoute(pick.name))
      }
      const store = useQuestStore.getState()
      // Its page has had its tour now: closing it shouldn't make Splitter offer the next one right away.
      if (quest.page !== 'any') store.markPrompted(quest.page)
      store.start(questId)
    },
    [navigate, pathname, search],
  )
}
