/**
 * What a player just did, as far as the quest log cares: a quest step that says "now you" (roll,
 * take a hit, rest, ...) waits for one of these. The app reports them where they happen; nothing
 * else listens, so reporting is free when the mentor is off.
 */
export type QuestAction =
  | 'open-sample'
  | 'open-sheet'
  | 'roll'
  | 'roll-mode'
  | 'damage'
  | 'rest'
  | 'equip'
  | 'cast'
  | 'journal'
  | 'theme'

type Listener = (action: QuestAction) => void
const listeners = new Set<Listener>()

export function reportQuestAction(action: QuestAction): void {
  for (const listener of listeners) listener(action)
}

export function onQuestAction(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
