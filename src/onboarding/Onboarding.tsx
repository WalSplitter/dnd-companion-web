import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import { useThemeStore } from '../theme/themeStore'
import { SplitterPortrait, SplitterWisp, type SplitterMood } from './Splitter'
import { FogSpotlight } from './FogSpotlight'
import { QuestBubble, type BubbleAction } from './QuestBubble'
import { QuestLog } from './QuestLog'
import { ACT_TITLES, QUESTS, questById, questObjective, type Quest } from './questCatalog'
import { onQuestAction, reportQuestAction } from './questEvents'
import { isActDone, isJourneyDone, nextQuest } from './questProgress'
import { useQuestStore, type QuestNotice } from './questStore'
import { findTourTarget, useTourTarget, type TargetBox } from './useTourTarget'
import { fitsQuest, questPageOf, sheetCharacterName, useStartQuest } from './useStartQuest'
import { WelcomeDialog } from './WelcomeDialog'

/** Re-renders on resize, so everything placed in viewport pixels follows. */
function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

/** Where Splitter's shard hovers during a tour: at the lit element's top-left corner, kept on screen. */
function wispPosition(box: TargetBox, viewport: { w: number; h: number }) {
  return { x: clamp(box.left + 4, 18, viewport.w - 18), y: clamp(box.top + 2, 22, viewport.h - 22) }
}

/** What completing `questId` (just now) earned: the act's seal, and the next quest to suggest. */
function completionNotice(questId: string): QuestNotice {
  const { completed } = useQuestStore.getState()
  const act = questById(questId)?.act
  return {
    kind: 'complete',
    questId,
    act: act && act !== 'side' && isActDone(act, completed) ? act : undefined,
    nextId: nextQuest(completed)?.id,
  }
}

/** Finishes the running quest: the log ticks it off and Splitter celebrates. */
function finishActiveQuest() {
  const store = useQuestStore.getState()
  const id = store.active?.questId
  if (!id) return
  store.complete(id)
  store.stop(false)
  store.setNotice(completionNotice(id))
}

function advanceTour() {
  const store = useQuestStore.getState()
  const active = store.active
  const quest = active && questById(active.questId)
  if (!active || !quest) return
  if (active.step < quest.steps.length - 1) store.goToStep(active.step + 1)
  else finishActiveQuest()
}

/** A practice quest's action would change a real character outside the sample vault, so there it is
 * only explained — the step's "now you" becomes a plain step. */
function practiceBlocked(quest: Quest): boolean {
  return Boolean(quest.practice) && useVaultStore.getState().source !== 'sample'
}

/**
 * Wires the app's events to the quest log: opening the arena or a sheet, and a theme change, are
 * reported here (the rest where they happen); every action moves a waiting tour step on, and
 * completes any open quest whose goal it is ("learning by doing").
 */
function useQuestReporting() {
  const { pathname } = useLocation()
  const sheetName = sheetCharacterName(pathname)

  useEffect(() => {
    if (!sheetName) return
    useQuestStore.getState().noteCharacter(sheetName)
    reportQuestAction('open-sheet')
  }, [sheetName])

  useEffect(
    () =>
      useVaultStore.subscribe((state, prev) => {
        if (state.source === 'sample' && prev.source !== 'sample') reportQuestAction('open-sample')
      }),
    [],
  )
  useEffect(
    () =>
      useThemeStore.subscribe((state, prev) => {
        if (state.theme !== prev.theme) reportQuestAction('theme')
      }),
    [],
  )

  useEffect(
    () =>
      onQuestAction((action) => {
        const store = useQuestStore.getState()
        if (!store.enabled) return
        const active = store.active
        const quest = active && questById(active.questId)
        if (active && quest && quest.steps[active.step]?.until === action && !practiceBlocked(quest)) {
          advanceTour()
          return
        }
        for (const q of QUESTS) {
          if (questObjective(q) !== action || store.completed.includes(q.id) || active?.questId === q.id) continue
          store.complete(q.id)
          const quiet = store.experience === 'veteran' || !store.experience || active || store.notice
          if (!quiet) store.setNotice(completionNotice(q.id))
        }
      }),
    [],
  )
}

/** The running tour step: fog, Splitter's shard at the target, the dialogue with its portrait. */
function TourStep({ quest, stepIndex }: { quest: Quest; stepIndex: number }) {
  const t = useT()
  const viewport = useViewport()
  const startQuest = useStartQuest()
  const step = quest.steps[stepIndex]
  const box = useTourTarget(step.target)
  const blocked = practiceBlocked(quest) && step.until !== undefined && step.until !== 'click'
  const until = blocked ? undefined : step.until
  const last = stepIndex === quest.steps.length - 1

  // Opens the tab the step lives on (once the page shows it), unless it's open already.
  useEffect(() => {
    if (!step.tab) return
    const anchor = step.tab
    let tries = 0
    const timer = window.setInterval(() => {
      const tab = findTourTarget(anchor)
      if (tab || ++tries > 40) window.clearInterval(timer)
      if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click()
    }, 50)
    return () => window.clearInterval(timer)
  }, [step])

  // A step that waits for a click on its target moves on once that happens.
  useEffect(() => {
    if (until !== 'click' || !step.target) return
    const anchor = step.target
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Node && findTourTarget(anchor)?.contains(e.target)) window.setTimeout(advanceTour, 80)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [until, step.target])

  const actions: BubbleAction[] = []
  if (stepIndex > 0) actions.push({ label: t('quest.back'), onClick: () => useQuestStore.getState().goToStep(stepIndex - 1) })
  if (blocked) {
    actions.push({
      label: t('quest.toArena'),
      onClick: () =>
        void useVaultStore
          .getState()
          .loadSampleVault()
          .then((ok) => {
            if (ok) void startQuest(quest.id)
          }),
    })
  }
  if (!until) actions.push({ label: t(last ? 'quest.finish' : 'quest.next'), onClick: advanceTour, primary: true })
  else actions.push({ label: t(until === 'click' ? 'quest.next' : 'quest.skipStep'), onClick: advanceTour })

  const wisp = box && wispPosition(box, viewport)

  return (
    <>
      <FogSpotlight box={box} />
      {wisp && <SplitterWisp x={wisp.x} y={wisp.y} />}
      <QuestBubble
        portrait={<SplitterPortrait shape="card" mood="talk" name={t('quest.mentorName')} />}
        box={box}
        heading={`${quest.icon} ${t(quest.title)}`}
        text={t(step.touchText && window.matchMedia('(hover: none)').matches ? step.touchText : step.text)}
        step={{ index: stepIndex, total: quest.steps.length }}
        waiting={until === 'click' ? t('quest.clickTarget') : until ? t('quest.yourTurn') : undefined}
        footnote={blocked ? t('quest.practiceHint') : undefined}
        actions={actions}
        onClose={() => useQuestStore.getState().stop(true)}
      />
    </>
  )
}

/** Splitter outside a tour: offering a page's quest, cheering a completed one, or asking to retreat. */
function NoticeView({ notice }: { notice: QuestNotice }) {
  const t = useT()
  const startQuest = useStartQuest()
  const page = questPageOf(useLocation().pathname)
  const store = useQuestStore.getState
  // "Later" counts as this page's offer: Splitter doesn't come straight back with another one.
  const dismiss = () => {
    if (page) store().markPrompted(page)
    store().setNotice(null)
  }

  let heading: string
  let text: string
  let mood: SplitterMood = 'idle'
  let actions: BubbleAction[]

  if (notice.kind === 'retreat') {
    heading = t('quest.mentorName')
    text = t('quest.retreatText')
    actions = [
      { label: t('quest.retreatNo'), onClick: dismiss, primary: true },
      { label: t('quest.retreatYes'), onClick: () => store().setEnabled(false) },
    ]
  } else {
    const quest = questById(notice.questId)
    if (!quest) return null
    if (notice.kind === 'complete') {
      mood = 'cheer'
      heading = t('quest.completeHeading')
      const next = notice.nextId ? questById(notice.nextId) : undefined
      const journeyDone = isJourneyDone(useQuestStore.getState().completed)
      text = [
        t('quest.completeText', { title: t(quest.title) }),
        notice.act ? t('quest.actSealed', { act: t(ACT_TITLES[notice.act]) }) : undefined,
        journeyDone && notice.act === 'epilogue' ? t('quest.journeyDone') : undefined,
      ]
        .filter(Boolean)
        .join(' ')
      actions = [
        ...(next ? [{ label: t('quest.continueWith', { title: t(next.title) }), onClick: () => void startQuest(next.id), primary: true }] : []),
        ...(journeyDone ? [{ label: t('quest.openCertificate'), onClick: () => store().openLog(), primary: !next }] : []),
        { label: t('quest.later'), onClick: dismiss },
      ]
    } else {
      heading = t('quest.newQuest')
      text = t('quest.promptText', { title: `${quest.icon} ${t(quest.title)}` })
      actions = [
        { label: t('quest.startQuest'), onClick: () => void startQuest(quest.id), primary: true },
        { label: t('quest.later'), onClick: dismiss },
        { label: t('quest.openLog'), onClick: () => store().openLog() },
      ]
    }
  }

  return (
    <QuestBubble
      box={CORNER}
      portrait={<SplitterPortrait shape="card" mood={mood} name={t('quest.mentorName')} />}
      heading={heading}
      text={text}
      actions={actions}
      onClose={dismiss}
      autoFocus={false}
    />
  )
}

/** A zero-size "target" in the bottom-right corner: notices are placed there, out of the way. */
const CORNER: TargetBox = { get top() { return window.innerHeight - 24 }, get left() { return window.innerWidth }, width: 0, height: 0 }

/** After the certificate, Splitter may stay dozing in a corner, as a small medallion: a click opens
 * the quest log. */
function Companion() {
  const t = useT()
  return (
    <button
      type="button"
      className="splitter-companion"
      onClick={() => useQuestStore.getState().openLog()}
      aria-label={t('quest.companionLabel')}
      title={t('quest.companionLabel')}
    >
      <SplitterPortrait shape="round" mood="doze" />
    </button>
  )
}

/**
 * The onboarding layer ("Die erste Quest"): the welcome dialog on the first visit, Splitter's tours and
 * notices, the quest log, and the companion. Mounted once in `App`, never inside Owlbear Rodeo.
 */
export function Onboarding() {
  useQuestReporting()
  const { pathname } = useLocation()
  const page = questPageOf(pathname)
  const startQuest = useStartQuest()
  const enabled = useQuestStore((s) => s.enabled)
  const experience = useQuestStore((s) => s.experience)
  const welcomeDeferred = useQuestStore((s) => s.welcomeDeferred)
  const active = useQuestStore((s) => s.active)
  const notice = useQuestStore((s) => s.notice)
  const log = useQuestStore((s) => s.log)
  const companion = useQuestStore((s) => s.companion)
  const journeyDoneAt = useQuestStore((s) => s.journeyDoneAt)
  const promptedPages = useQuestStore((s) => s.promptedPages)
  const completed = useQuestStore((s) => s.completed)
  const source = useVaultStore((s) => s.source)
  const sheetName = sheetCharacterName(pathname)
  const sheetCharacter = useVaultStore((s) => s.vault.characters.find((c) => c.frontmatter.name === sheetName)?.frontmatter)
  const welcome = enabled && !experience && !welcomeDeferred

  // The first visit of a page offers its next quest, once, unless the player said they know it all.
  const promptTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(promptTimer.current)
    if (!enabled || !experience || experience === 'veteran' || active || notice || log || !page) return
    if (promptedPages.includes(page) || (page !== 'start' && source === 'none')) return
    const quest = nextQuest(completed, page, (q) => page !== 'sheet' || fitsQuest(q, sheetCharacter))
    if (!quest) return
    promptTimer.current = window.setTimeout(() => {
      const store = useQuestStore.getState()
      store.markPrompted(page)
      store.setNotice({ kind: 'prompt', questId: quest.id })
    }, 1200)
    return () => window.clearTimeout(promptTimer.current)
  }, [enabled, experience, active, notice, log, page, promptedPages, source, completed, sheetCharacter])

  if (!enabled) return null
  const quest = active ? questById(active.questId) : undefined

  return (
    <>
      {welcome && (
        <WelcomeDialog
          onChosen={(choice) => {
            if (choice !== 'veteran' && page === 'start') {
              useQuestStore.getState().markPrompted('start')
              void startQuest('welcome')
            }
          }}
        />
      )}
      {!welcome && quest && active && <TourStep key={quest.id} quest={quest} stepIndex={active.step} />}
      {!welcome && !quest && notice && <NoticeView notice={notice} />}
      {!welcome && !quest && !notice && journeyDoneAt && companion && !log && <Companion />}
      {log && <QuestLog />}
    </>
  )
}
