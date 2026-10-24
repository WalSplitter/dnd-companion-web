import { useCallback } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { characterRoute } from '../routes/paths'
import { useVaultStore } from '../store/vaultStore'
import type { CharacterFrontmatter } from '../vault/types'
import { questById, type Quest } from './questCatalog'
import { useQuestStore, type QuestPageKey } from './questStore'

/** Which quest page a route is, if any. */
export function questPageOf(pathname: string): QuestPageKey | null {
  if (pathname === '/') return 'start'
  if (pathname === '/characters') return 'party'
  if (matchPath('/characters/:characterName', pathname)) return 'sheet'
  return null
}

export function sheetCharacterName(pathname: string): string | undefined {
  const raw = matchPath('/characters/:characterName', pathname)?.params.characterName
  if (raw === undefined) return undefined
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** Whether a sheet quest can run on this character's sheet. */
export function fitsQuest(quest: Quest, character: CharacterFrontmatter | undefined): boolean {
  return quest.needs !== 'spells' || Boolean(character?.spellcasting)
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
      if (quest.page === 'party' && (pathname !== '/characters' || search)) navigate('/characters')
      if (quest.page === 'sheet') {
        const characters = useVaultStore.getState().vault.characters.map((c) => c.frontmatter)
        const byName = (name: string | undefined) => characters.find((c) => c.name === name)
        const current = byName(sheetCharacterName(pathname))
        const pick = [current, byName(useQuestStore.getState().lastCharacter), ...characters].find((c) => c && fitsQuest(quest, c))
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
