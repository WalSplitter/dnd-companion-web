import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useT, type TranslationKey } from '../i18n/useI18n'
import { SplitterPortrait } from './Splitter'
import { useQuestStore, type Experience } from './questStore'

const CHOICES: { key: Experience; icon: string; title: TranslationKey; body: TranslationKey }[] = [
  { key: 'new', icon: '🌱', title: 'quest.welcome.newTitle', body: 'quest.welcome.newBody' },
  { key: 'player', icon: '🎲', title: 'quest.welcome.playerTitle', body: 'quest.welcome.playerBody' },
  { key: 'veteran', icon: '⚔️', title: 'quest.welcome.veteranTitle', body: 'quest.welcome.veteranBody' },
]

/**
 * The first visit: Splitter, in a medallion on the card's top edge, asks how much the player knows — that sets how
 * much it explains (runes on for newcomers, no tours offered unasked to veterans). "Later" asks again
 * next time; "no mentor" turns the whole thing off (the quest log button can bring it back).
 */
export function WelcomeDialog({ onChosen }: { onChosen: (choice: Experience) => void }) {
  const t = useT()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cardRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }, [])

  const choose = (choice: Experience) => {
    useQuestStore.getState().setExperience(choice)
    onChosen(choice)
  }

  return createPortal(
    <div className="quest-welcome-backdrop">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quest-welcome-title"
        className="quest-welcome rpg-panel"
        onKeyDown={(e) => {
          if (e.key === 'Escape') useQuestStore.getState().deferWelcome()
        }}
      >
        <SplitterPortrait shape="round" mood="talk" className="quest-welcome-medallion" />
        <p className="quest-welcome-name">{t('quest.mentorName')}</p>
        <h2 id="quest-welcome-title" className="quest-welcome-title">
          {t('quest.welcome.heading')}
        </h2>
        <p className="quest-welcome-text">{t('quest.welcome.text')}</p>
        <div className="quest-welcome-choices">
          {CHOICES.map((c) => (
            <button key={c.key} type="button" className="quest-choice" onClick={() => choose(c.key)}>
              <span className="quest-choice-icon" aria-hidden>
                {c.icon}
              </span>
              <span className="quest-choice-title">{t(c.title)}</span>
              <span className="quest-choice-body">{t(c.body)}</span>
            </button>
          ))}
        </div>
        <div className="quest-welcome-footer">
          <button type="button" className="quest-link" onClick={() => useQuestStore.getState().deferWelcome()}>
            {t('quest.welcome.later')}
          </button>
          <button type="button" className="quest-link" onClick={() => useQuestStore.getState().setEnabled(false)}>
            {t('quest.welcome.noMentor')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
