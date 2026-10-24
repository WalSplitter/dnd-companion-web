import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActId } from './questCatalog'
import { isJourneyDone } from './questProgress'

/** How much a newcomer wants explained, answered once in the welcome dialog. */
export type Experience = 'new' | 'player' | 'veteran'

export type QuestPageKey = 'start' | 'party' | 'sheet'

/** What Splitter has to say when no tour step is showing. */
export type QuestNotice =
  | { kind: 'prompt'; questId: string }
  | { kind: 'complete'; questId: string; act?: ActId; nextId?: string }
  | { kind: 'retreat' }
  | { kind: 'practice'; questId: string }

interface QuestState {
  /** The master switch ("Mentor & Questlog"). Off: no Splitter, no runes, only the menu to turn it back on. */
  enabled: boolean
  /** Undefined until the welcome dialog was answered. */
  experience?: Experience
  /** Runes beside rules terms. */
  learnMode: boolean
  completed: string[]
  /** When the certificate was earned (ISO date). */
  journeyDoneAt?: string
  /** Lexicon terms already opened — their rune fades. */
  readTerms: string[]
  /** Pages where Splitter already offered their first quest unasked. */
  promptedPages: QuestPageKey[]
  /** How often a running tour was closed — the second time Splitter asks whether to retreat for good. */
  dismissals: number
  retreatAsked: boolean
  /** After the certificate: Splitter stays in a corner as a little companion. */
  companion: boolean
  /** The character whose sheet the player last opened, for the certificate. */
  lastCharacter?: string

  // Not persisted: the running tour and the open panels.
  active: { questId: string; step: number } | null
  notice: QuestNotice | null
  log: 'quests' | 'compendium' | null
  /** "Later" in the welcome dialog: ask again on the next visit, not now. */
  welcomeDeferred: boolean

  setExperience: (experience: Experience) => void
  setEnabled: (enabled: boolean) => void
  setLearnMode: (learnMode: boolean) => void
  setCompanion: (companion: boolean) => void
  deferWelcome: () => void
  start: (questId: string) => void
  goToStep: (step: number) => void
  /** Ends the tour without completing it. `dismissed`: the player closed it (counts towards the retreat question). */
  stop: (dismissed: boolean) => void
  complete: (questId: string) => void
  setNotice: (notice: QuestNotice | null) => void
  markRead: (term: string) => void
  markPrompted: (page: QuestPageKey) => void
  noteCharacter: (name: string) => void
  openLog: (section?: 'quests' | 'compendium') => void
  closeLog: () => void
  reset: () => void
}

const INITIAL = {
  enabled: true,
  experience: undefined,
  learnMode: false,
  completed: [],
  journeyDoneAt: undefined,
  readTerms: [],
  promptedPages: [],
  dismissals: 0,
  retreatAsked: false,
  companion: true,
  lastCharacter: undefined,
} satisfies Partial<QuestState>

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      active: null,
      notice: null,
      log: null,
      welcomeDeferred: false,

      setExperience: (experience) => set({ experience, learnMode: experience === 'new' }),
      setEnabled: (enabled) => set(enabled ? { enabled } : { enabled, active: null, notice: null }),
      setLearnMode: (learnMode) => set({ learnMode }),
      setCompanion: (companion) => set({ companion }),
      deferWelcome: () => set({ welcomeDeferred: true }),
      start: (questId) => set({ active: { questId, step: 0 }, notice: null, log: null }),
      goToStep: (step) => set((s) => (s.active ? { active: { ...s.active, step } } : {})),
      stop: (dismissed) =>
        set((s) => {
          const dismissals = dismissed ? s.dismissals + 1 : s.dismissals
          const ask = dismissed && dismissals >= 2 && !s.retreatAsked
          return { active: null, dismissals, retreatAsked: s.retreatAsked || ask, notice: ask ? { kind: 'retreat' } : null }
        }),
      complete: (questId) =>
        set((s) => {
          if (s.completed.includes(questId)) return {}
          const completed = [...s.completed, questId]
          const done = !s.journeyDoneAt && isJourneyDone(completed)
          return { completed, ...(done ? { journeyDoneAt: new Date().toISOString() } : {}) }
        }),
      setNotice: (notice) => set({ notice }),
      markRead: (term) => set((s) => (s.readTerms.includes(term) ? {} : { readTerms: [...s.readTerms, term] })),
      markPrompted: (page) => set((s) => (s.promptedPages.includes(page) ? {} : { promptedPages: [...s.promptedPages, page] })),
      noteCharacter: (name) => set({ lastCharacter: name }),
      openLog: (section = 'quests') => set({ log: section }),
      closeLog: () => set({ log: null }),
      reset: () => set({ ...INITIAL, experience: get().experience, active: null, notice: null }),
    }),
    {
      name: 'dnd-companion-quests',
      version: 1,
      partialize: (s) => ({
        enabled: s.enabled,
        experience: s.experience,
        learnMode: s.learnMode,
        completed: s.completed,
        journeyDoneAt: s.journeyDoneAt,
        readTerms: s.readTerms,
        promptedPages: s.promptedPages,
        dismissals: s.dismissals,
        retreatAsked: s.retreatAsked,
        companion: s.companion,
        lastCharacter: s.lastCharacter,
      }),
    },
  ),
)
