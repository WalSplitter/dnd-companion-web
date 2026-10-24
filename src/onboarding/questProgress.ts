import type { TranslationKey } from '../i18n/useI18n'
import { MAIN_ACTS, QUESTS, type ActId, type Quest, type QuestPage } from './questCatalog'

/** Pure progress rules of the quest log, apart from the store so they're easy to test. */

export function questsOfAct(act: ActId): Quest[] {
  return QUESTS.filter((q) => q.act === act)
}

export function isActDone(act: ActId, completed: readonly string[]): boolean {
  return questsOfAct(act).every((q) => completed.includes(q.id))
}

/** The acts before the epilogue are open from the start (a player with their own vault may well
 * skip the arena); the epilogue opens once they are all done. */
export function isActUnlocked(act: ActId, completed: readonly string[]): boolean {
  if (act !== 'epilogue') return true
  return MAIN_ACTS.filter((a) => a !== 'epilogue').every((a) => isActDone(a, completed))
}

/** All main acts done: the certificate is earned. */
export function isJourneyDone(completed: readonly string[]): boolean {
  return MAIN_ACTS.every((a) => isActDone(a, completed))
}

const MAIN_QUESTS = QUESTS.filter((q) => q.act !== 'side')

/** Share of the main quests done, 0..1 — the ring on the quest log button. */
export function journeyProgress(completed: readonly string[]): number {
  return MAIN_QUESTS.filter((q) => completed.includes(q.id)).length / MAIN_QUESTS.length
}

/** The next open main quest in the log's order, optionally only one that can run on `page`. */
export function nextQuest(completed: readonly string[], page?: QuestPage, canRun: (quest: Quest) => boolean = () => true): Quest | undefined {
  return MAIN_QUESTS.find(
    (q) => !completed.includes(q.id) && isActUnlocked(q.act, completed) && (page === undefined || q.page === page) && canRun(q),
  )
}

/** The player's rank as an adventurer, from the share of main quests done. */
export function rankKey(progress: number): TranslationKey {
  if (progress >= 1) return 'quest.rank.hero'
  if (progress >= 0.6) return 'quest.rank.adventurer'
  if (progress >= 0.25) return 'quest.rank.apprentice'
  return 'quest.rank.novice'
}
