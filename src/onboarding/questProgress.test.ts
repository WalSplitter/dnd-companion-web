import { beforeEach, describe, expect, it } from 'vitest'
import { MAIN_ACTS, QUESTS, questObjective } from './questCatalog'
import { isActDone, isActUnlocked, isJourneyDone, journeyProgress, nextQuest, questsOfAct, rankKey } from './questProgress'
import { useQuestStore } from './questStore'

const mainIds = QUESTS.filter((q) => q.act !== 'side').map((q) => q.id)
const allBut = (act: string) => QUESTS.filter((q) => q.act !== act && q.act !== 'side').map((q) => q.id)

describe('quest progress', () => {
  it('opens every act but the epilogue from the start', () => {
    for (const act of MAIN_ACTS) expect(isActUnlocked(act, [])).toBe(act !== 'epilogue')
    expect(isActUnlocked('epilogue', allBut('epilogue'))).toBe(true)
  })

  it('counts an act done once all its quests are', () => {
    const party = questsOfAct('party').map((q) => q.id)
    expect(isActDone('party', party.slice(1))).toBe(false)
    expect(isActDone('party', party)).toBe(true)
  })

  it('suggests the next open quest, optionally for one page', () => {
    expect(nextQuest([])?.id).toBe('welcome')
    expect(nextQuest(['welcome'])?.act).toBe('party')
    expect(nextQuest([], 'sheet')?.id).toBe('sheet-attributes')
    expect(nextQuest([], 'sheet', (q) => q.id !== 'sheet-attributes')?.id).toBe('sheet-roll')
    // The epilogue's start-page quest stays hidden until the acts before it are done.
    expect(nextQuest(['welcome'], 'start')).toBeUndefined()
    expect(nextQuest(mainIds)).toBeUndefined()
  })

  it('leaves the side paths out of the journey', () => {
    expect(journeyProgress([])).toBe(0)
    expect(journeyProgress(['side-theme'])).toBe(0)
    expect(journeyProgress(mainIds)).toBe(1)
    expect(isJourneyDone(mainIds)).toBe(true)
  })

  it('ranks the player by progress', () => {
    expect(rankKey(0)).toBe('quest.rank.novice')
    expect(rankKey(0.3)).toBe('quest.rank.apprentice')
    expect(rankKey(0.7)).toBe('quest.rank.adventurer')
    expect(rankKey(1)).toBe('quest.rank.hero')
  })

  it('names the action a quest finally waits for', () => {
    expect(questObjective(QUESTS.find((q) => q.id === 'sheet-roll')!)).toBe('roll')
    expect(questObjective(QUESTS.find((q) => q.id === 'party-meet')!)).toBeUndefined()
    expect(questObjective(QUESTS.find((q) => q.id === 'party-compare')!)).toBeUndefined()
  })
})

describe('quest store', () => {
  beforeEach(() => {
    useQuestStore.setState({ ...useQuestStore.getInitialState() })
  })

  it('turns the runes on for newcomers only', () => {
    useQuestStore.getState().setExperience('new')
    expect(useQuestStore.getState().learnMode).toBe(true)
    useQuestStore.getState().setExperience('player')
    expect(useQuestStore.getState().learnMode).toBe(false)
  })

  it('stamps the certificate date with the last main quest, once', () => {
    const store = useQuestStore.getState()
    for (const id of mainIds.slice(0, -1)) store.complete(id)
    expect(useQuestStore.getState().journeyDoneAt).toBeUndefined()
    store.complete(mainIds.at(-1)!)
    const date = useQuestStore.getState().journeyDoneAt
    expect(date).toBeDefined()
    store.complete('side-theme')
    expect(useQuestStore.getState().journeyDoneAt).toBe(date)
  })

  it('asks to retreat on the second closed tour, and only then', () => {
    const store = useQuestStore.getState()
    store.start('welcome')
    store.stop(true)
    expect(useQuestStore.getState().notice).toBeNull()
    store.start('welcome')
    store.stop(true)
    expect(useQuestStore.getState().notice).toEqual({ kind: 'retreat' })
    store.start('welcome')
    store.stop(true)
    expect(useQuestStore.getState().notice).toBeNull()
  })

  it('keeps the welcome answer when the progress is reset', () => {
    const store = useQuestStore.getState()
    store.setExperience('player')
    store.complete('welcome')
    store.markRead('skill')
    store.reset()
    expect(useQuestStore.getState()).toMatchObject({ experience: 'player', completed: [], readTerms: [], enabled: true })
  })
})

describe('questStore.reset', () => {
  it("keeps the welcome answer, and with it a newcomer's runes", () => {
    useQuestStore.getState().setExperience('new')
    useQuestStore.getState().complete('welcome')
    useQuestStore.getState().reset()
    expect(useQuestStore.getState()).toMatchObject({ experience: 'new', learnMode: true, completed: [] })
  })
})
