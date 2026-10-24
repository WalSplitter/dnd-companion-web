import { useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useDismiss } from '../components/useDismiss'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import { ProgressRing } from './QuestLog'
import { isJourneyDone, journeyProgress, nextQuest } from './questProgress'
import { useQuestStore } from './questStore'
import { fitsQuest, questPageOf, sheetCharacterName, useStartQuest } from './useStartQuest'

/** A rolled-up scroll, the quest log's emblem. */
function ScrollIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
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

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative h-4 w-7 shrink-0 rounded-full transition ${on ? 'bg-trim' : 'bg-border'}`} aria-hidden>
      <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-surface transition-all ${on ? 'left-3.5' : 'left-0.5'}`} />
    </span>
  )
}

/**
 * The "?" of the header: the quest log button, its ring filling with the journey, and a glint when
 * this page has a quest waiting. Its menu opens the log, the tour of this page, the compendium, and
 * holds the switches — learn mode (runes), the companion, and the mentor as a whole.
 */
export function QuestMenu() {
  const t = useT()
  const { pathname } = useLocation()
  const startQuest = useStartQuest()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useDismiss(open, () => setOpen(false), [rootRef])

  const enabled = useQuestStore((s) => s.enabled)
  const learnMode = useQuestStore((s) => s.learnMode)
  const companion = useQuestStore((s) => s.companion)
  const completed = useQuestStore((s) => s.completed)
  const page = questPageOf(pathname)
  const sheetName = sheetCharacterName(pathname)
  const sheetCharacter = useVaultStore((s) => s.vault.characters.find((c) => c.frontmatter.name === sheetName)?.frontmatter)
  const pageQuest = page ? nextQuest(completed, page, (q) => page !== 'sheet' || fitsQuest(q, sheetCharacter)) : undefined
  const progress = journeyProgress(completed)
  const store = useQuestStore.getState

  const item = 'quest-menu-item'
  const run = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        data-tour="header.quests"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('quest.menuLabel')}
        title={t('quest.menuLabel')}
        className={`quest-menu-trigger ${enabled && pageQuest ? 'has-quest' : ''}`}
      >
        <ProgressRing value={enabled ? progress : 0} size={32}>
          <ScrollIcon />
        </ProgressRing>
      </button>
      {open && (
        <div role="menu" aria-label={t('quest.menuLabel')} className="quest-menu rpg-panel">
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
              <button type="button" role="menuitemcheckbox" aria-checked className={item} onClick={run(() => store().setEnabled(false))}>
                <span aria-hidden>🌙</span>
                <span className="flex-1">{t('quest.mentorSwitch')}</span>
                <Toggle on />
              </button>
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
              <button type="button" role="menuitemcheckbox" aria-checked={false} className={item} onClick={run(() => store().setEnabled(true))}>
                <span aria-hidden>🌙</span>
                <span className="flex-1">{t('quest.mentorSwitch')}</span>
                <Toggle on={false} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
