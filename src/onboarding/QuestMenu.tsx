import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Toggle } from '../components/Toggle'
import { useDismiss } from '../components/useDismiss'
import { useT } from '../i18n/useI18n'
import { PHONE_MAX_WIDTH } from '../utils/viewport'
import { ProgressRing } from './QuestLog'
import { isJourneyDone, journeyProgress } from './questProgress'
import { useQuestStore } from './questStore'
import { usePageQuest, useStartQuest } from './useStartQuest'

/** A rolled-up scroll, the quest log's emblem. */
function ScrollIcon() {
  return (
    // The viewBox is nudged so the scroll's own shape, not its 24×24 box, sits in the middle.
    <svg viewBox="-0.5 0.5 24 24" className="size-4" aria-hidden>
      <path
        d="M7 4h10a2.5 2.5 0 0 1 0 5h-1v9.5A2.5 2.5 0 0 1 13.5 21H6a2.5 2.5 0 0 1-2.5-2.5V18H13v.5a1 1 0 0 0 2 0V6.5A2.5 2.5 0 0 0 12.5 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 9h5M8 12h5M8 15h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The "?" of the header: the quest log button, its ring filling with the journey, and a glint when
 * this page has a quest waiting. Its menu opens the log, the tour of this page, the compendium, and
 * holds the switches — learn mode (runes), the companion, and the mentor as a whole.
 */
export function QuestMenu() {
  const t = useT()
  const startQuest = useStartQuest()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<{ top: number; right: number; left?: number; width?: string } | null>(null)
  useDismiss(open, () => setOpen(false), [triggerRef, menuRef])

  // In a portal under the trigger, like the theme menu: inside the header it would share the header's
  // layer, and a tour's fog (which lies over the header) would cover it.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect()
      if (!r) return
      // On a phone the trigger isn't at the screen's edge: the menu spans the width instead.
      if (window.innerWidth < PHONE_MAX_WIDTH) setAnchor({ top: r.bottom + 8, left: 16, right: 16, width: 'auto' })
      else setAnchor({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  const enabled = useQuestStore((s) => s.enabled)
  const learnMode = useQuestStore((s) => s.learnMode)
  const companion = useQuestStore((s) => s.companion)
  const completed = useQuestStore((s) => s.completed)
  const { quest: pageQuest } = usePageQuest()
  const progress = journeyProgress(completed)
  const store = useQuestStore.getState

  const item = 'quest-menu-item'
  const run = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }
  const mentorSwitch = (
    <button type="button" role="menuitemcheckbox" aria-checked={enabled} className={item} onClick={run(() => store().setEnabled(!enabled))}>
      <span aria-hidden>🌙</span>
      <span className="flex-1">{t('quest.mentorSwitch')}</span>
      <Toggle on={enabled} />
    </button>
  )

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        data-tour="header.quests"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('quest.menuLabel')}
        title={t('quest.menuLabel')}
        className={`quest-menu-trigger ${enabled && pageQuest ? 'has-quest' : ''}`}
      >
        <ProgressRing value={enabled ? progress : 0} size={30}>
          <ScrollIcon />
        </ProgressRing>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            data-tour="header.questMenu"
            aria-label={t('quest.menuLabel')}
            className="quest-menu rpg-panel"
            style={anchor ?? { visibility: 'hidden' }}
          >
            {enabled ? (
              <>
                <button type="button" role="menuitem" className={item} onClick={run(() => store().openLog('quests'))}>
                  <span aria-hidden>📜</span>
                  <span className="flex-1">{t('quest.openLog')}</span>
                  <span className="font-num text-xs text-fg-muted">{Math.round(progress * 100)}%</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={item}
                  disabled={!pageQuest}
                  onClick={run(() => pageQuest && void startQuest(pageQuest.id))}
                >
                  <span aria-hidden>✨</span>
                  <span className="flex-1">{pageQuest ? t('quest.pageTour', { title: t(pageQuest.title) }) : t('quest.pageTourNone')}</span>
                </button>
                <button type="button" role="menuitem" className={item} onClick={run(() => store().openLog('compendium'))}>
                  <span aria-hidden>📚</span>
                  <span className="flex-1">{t('quest.tabCompendium')}</span>
                </button>
                <div className="quest-menu-sep" />
                <button type="button" role="menuitemcheckbox" aria-checked={learnMode} className={item} onClick={() => store().setLearnMode(!learnMode)}>
                  <span aria-hidden>🔮</span>
                  <span className="flex-1">{t('quest.learnMode')}</span>
                  <Toggle on={learnMode} />
                </button>
                {isJourneyDone(completed) && (
                  <button type="button" role="menuitemcheckbox" aria-checked={companion} className={item} onClick={() => store().setCompanion(!companion)}>
                    <span aria-hidden>🕯️</span>
                    <span className="flex-1">{t('quest.companion')}</span>
                    <Toggle on={companion} />
                  </button>
                )}
                {mentorSwitch}
                <div className="quest-menu-sep" />
                <button
                  type="button"
                  role="menuitem"
                  className={`${item} text-fg-muted`}
                  onClick={run(() => {
                    if (window.confirm(t('quest.resetConfirm'))) store().reset()
                  })}
                >
                  <span aria-hidden>↺</span>
                  <span className="flex-1">{t('quest.reset')}</span>
                </button>
              </>
            ) : (
              <>
                <p className="px-3 pt-2 pb-1 text-xs leading-relaxed text-fg-muted">{t('quest.mentorOffHint')}</p>
                {mentorSwitch}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
