import type { TranslationKey } from '../i18n/useI18n'
import type { QuestAction } from './questEvents'

/**
 * "Die erste Quest": the guided tour as a quest log. Every quest is a short tour of one page, led by
 * Splitter, that ends when the player has done the thing it teaches (`until` on its last step). Acts
 * follow the pages a newcomer meets in order; the side paths can be taken any time.
 *
 * Targets are `data-tour` anchors in the page (`questCatalog.test.ts` checks that each one exists),
 * so the tour survives layout changes as long as the anchor stays on the right element.
 */

export type QuestPage = 'start' | 'party' | 'sheet' | 'any'

export type ActId = 'prologue' | 'party' | 'sheet' | 'gear' | 'stories' | 'epilogue' | 'side'

/** The acts that count towards the certificate, in order. `side` is optional. */
export const MAIN_ACTS: readonly ActId[] = ['prologue', 'party', 'sheet', 'gear', 'stories', 'epilogue']

export interface QuestStep {
  /** The `data-tour` anchor Splitter flies to; none = Splitter speaks from the middle of the screen. */
  target?: string
  text: TranslationKey
  /** The text on touch screens, where nothing can be hovered. */
  touchText?: TranslationKey
  /** A footnote shown only in the sample vault (e.g. that what's on screen is made up). */
  sampleNote?: TranslationKey
  /** How the step ends: the Next button (default), a click on the target, or something the player does. */
  until?: 'click' | QuestAction
  /** A tab or menu (`data-tour` anchor of its button) to open first, unless it's already open. */
  tab?: string
}

export interface Quest {
  id: string
  act: ActId
  icon: string
  title: TranslationKey
  page: QuestPage
  steps: QuestStep[]
  /** Its action changes the character, so it's only done for real in the sample vault (the "arena"). */
  practice?: boolean
  /** A sheet quest that needs a spellcaster, or a party quest that needs a chronicle (a GitHub or the
   * sample vault) — without one it only explains and offers the arena. */
  needs?: 'spells' | 'history'
  /** What completes the quest when done outside the tour; defaults to the action its last step waits for. */
  goal?: QuestAction
}

export const ACT_TITLES: Record<ActId, TranslationKey> = {
  prologue: 'quest.act.prologue',
  party: 'quest.act.party',
  sheet: 'quest.act.sheet',
  gear: 'quest.act.gear',
  stories: 'quest.act.stories',
  epilogue: 'quest.act.epilogue',
  side: 'quest.act.side',
}

const SHEET_TAB = 'sheet.tab.sheet'
const PARTY_TAB = 'party.tab.party'

export const QUESTS: readonly Quest[] = [
  {
    id: 'welcome',
    act: 'prologue',
    icon: '✨',
    title: 'quest.welcome.title',
    page: 'start',
    // A click, not the vault opening: the sample may already be open, and opening it again changes nothing.
    steps: [{ text: 'quest.welcome.s1' }, { target: 'start.sample', text: 'quest.welcome.s2', until: 'click' }],
    goal: 'open-sample',
  },

  {
    id: 'party-meet',
    act: 'party',
    icon: '🛡️',
    title: 'quest.partyMeet.title',
    page: 'party',
    steps: [
      { target: 'party.list', text: 'quest.partyMeet.s1', tab: PARTY_TAB },
      { target: 'party.view', text: 'quest.partyMeet.s2' },
    ],
  },
  {
    id: 'party-compare',
    act: 'party',
    icon: '📊',
    title: 'quest.partyCompare.title',
    page: 'party',
    steps: [
      { target: 'party.tab.compare', text: 'quest.partyCompare.s1', until: 'click' },
      { target: 'party.content', text: 'quest.partyCompare.s2' },
    ],
  },
  {
    id: 'party-choose',
    act: 'party',
    icon: '🧝',
    title: 'quest.partyChoose.title',
    page: 'party',
    steps: [{ target: 'party.list', text: 'quest.partyChoose.s1', tab: PARTY_TAB, until: 'open-sheet' }],
  },

  {
    id: 'sheet-attributes',
    act: 'sheet',
    icon: '💎',
    title: 'quest.sheetAttributes.title',
    page: 'sheet',
    steps: [
      { target: 'sheet.attributes', text: 'quest.sheetAttributes.s1', tab: SHEET_TAB },
      { target: 'sheet.attributes', text: 'quest.sheetAttributes.s2' },
    ],
  },
  {
    id: 'sheet-roll',
    act: 'sheet',
    icon: '🎲',
    title: 'quest.sheetRoll.title',
    page: 'sheet',
    steps: [{ target: 'sheet.skills', text: 'quest.sheetRoll.s1', tab: SHEET_TAB, until: 'roll' }],
  },
  {
    id: 'sheet-advantage',
    act: 'sheet',
    icon: '🍀',
    title: 'quest.sheetAdvantage.title',
    page: 'sheet',
    steps: [
      { target: 'sheet.rollLog', text: 'quest.sheetAdvantage.s1' },
      { target: 'sheet.rollLog', text: 'quest.sheetAdvantage.s2', touchText: 'quest.sheetAdvantage.s2Touch', until: 'roll-mode' },
    ],
  },
  {
    id: 'sheet-derivation',
    act: 'sheet',
    icon: '🔍',
    title: 'quest.sheetDerivation.title',
    page: 'sheet',
    steps: [{ target: 'sheet.skills', text: 'quest.sheetDerivation.s1', touchText: 'quest.sheetDerivation.s1Touch', tab: SHEET_TAB }],
  },
  {
    id: 'sheet-defense',
    act: 'sheet',
    icon: '🛡️',
    title: 'quest.sheetDefense.title',
    page: 'sheet',
    steps: [{ target: 'sheet.defense', text: 'quest.sheetDefense.s1', touchText: 'quest.sheetDefense.s1Touch' }],
  },
  {
    id: 'sheet-hit',
    act: 'sheet',
    icon: '💔',
    title: 'quest.sheetHit.title',
    page: 'sheet',
    practice: true,
    steps: [
      { target: 'sheet.vitals', text: 'quest.sheetHit.s1' },
      { target: 'sheet.vitals', text: 'quest.sheetHit.s2', until: 'damage' },
    ],
  },
  {
    id: 'sheet-rest',
    act: 'sheet',
    icon: '🔥',
    title: 'quest.sheetRest.title',
    page: 'sheet',
    practice: true,
    steps: [{ target: 'sheet.rest', text: 'quest.sheetRest.s1', until: 'rest' }],
  },
  {
    id: 'sheet-exhaustion',
    act: 'sheet',
    icon: '🩸',
    title: 'quest.sheetExhaustion.title',
    page: 'sheet',
    steps: [{ target: 'sheet.exhaustion', text: 'quest.sheetExhaustion.s1' }],
  },

  {
    id: 'gear-equip',
    act: 'gear',
    icon: '🎒',
    title: 'quest.gearEquip.title',
    page: 'sheet',
    practice: true,
    steps: [
      { target: 'sheet.tab.inventory', text: 'quest.gearEquip.s1', until: 'click' },
      { target: 'sheet.panel', text: 'quest.gearEquip.s2', until: 'equip' },
    ],
  },
  {
    id: 'gear-cast',
    act: 'gear',
    icon: '🪄',
    title: 'quest.gearCast.title',
    page: 'sheet',
    practice: true,
    needs: 'spells',
    steps: [
      { target: 'sheet.tab.spells', text: 'quest.gearCast.s1', until: 'click' },
      { target: 'sheet.panel', text: 'quest.gearCast.s2', until: 'cast' },
    ],
  },
  {
    id: 'gear-skilltree',
    act: 'gear',
    icon: '🌳',
    title: 'quest.gearSkillTree.title',
    page: 'sheet',
    steps: [
      { target: 'sheet.tab.skills', text: 'quest.gearSkillTree.s1', until: 'click' },
      { target: 'sheet.panel', text: 'quest.gearSkillTree.s2' },
    ],
  },

  {
    id: 'stories-journal',
    act: 'stories',
    icon: '📖',
    title: 'quest.storiesJournal.title',
    page: 'sheet',
    practice: true,
    steps: [
      { target: 'sheet.tab.journal', text: 'quest.storiesJournal.s1', until: 'click' },
      { target: 'sheet.panel', text: 'quest.storiesJournal.s2', until: 'journal' },
    ],
  },
  {
    id: 'stories-campaign',
    act: 'stories',
    icon: '🗺️',
    title: 'quest.storiesCampaign.title',
    page: 'party',
    steps: [
      { target: 'party.tab.campaign', text: 'quest.storiesCampaign.s1', until: 'click' },
      { target: 'party.content', text: 'quest.storiesCampaign.s2' },
    ],
  },
  {
    id: 'stories-chronicle',
    act: 'stories',
    icon: '⏳',
    title: 'quest.storiesChronicle.title',
    page: 'party',
    needs: 'history',
    steps: [
      { target: 'party.tab.chronicle', text: 'quest.storiesChronicle.s1', until: 'click' },
      { target: 'party.content', text: 'quest.storiesChronicle.s2', tab: 'party.tab.chronicle', sampleNote: 'quest.storiesChronicle.sampleNote' },
    ],
  },

  {
    id: 'epilogue-own',
    act: 'epilogue',
    icon: '🏰',
    title: 'quest.epilogue.title',
    page: 'start',
    steps: [{ text: 'quest.epilogue.s1' }, { target: 'start.portals', text: 'quest.epilogue.s2' }],
  },

  {
    id: 'side-theme',
    act: 'side',
    icon: '🎨',
    title: 'quest.sideTheme.title',
    page: 'any',
    steps: [{ target: 'header.theme', text: 'quest.sideTheme.s1', until: 'theme' }],
  },
  {
    id: 'side-runes',
    act: 'side',
    icon: '🔮',
    title: 'quest.sideRunes.title',
    page: 'any',
    steps: [{ target: 'header.questMenu', tab: 'header.quests', text: 'quest.sideRunes.s1' }],
  },
  {
    id: 'side-offline',
    act: 'side',
    icon: '📡',
    title: 'quest.sideOffline.title',
    page: 'any',
    steps: [{ text: 'quest.sideOffline.s1' }],
  },
  {
    id: 'side-owlbear',
    act: 'side',
    icon: '🦉',
    title: 'quest.sideOwlbear.title',
    page: 'any',
    steps: [{ text: 'quest.sideOwlbear.s1' }],
  },
]

export function questById(id: string): Quest | undefined {
  return QUESTS.find((q) => q.id === id)
}

/** The action a quest is finally waiting for, if its last step waits for one: doing it completes
 * the quest even when the tour isn't running ("learning by doing"). */
export function questObjective(quest: Quest): QuestAction | undefined {
  if (quest.goal) return quest.goal
  const until = quest.steps[quest.steps.length - 1]?.until
  return until && until !== 'click' ? until : undefined
}
