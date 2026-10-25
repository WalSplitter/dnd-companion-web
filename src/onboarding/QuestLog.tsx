import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDismiss } from '../components/useDismiss'
import { useI18n, useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import { LEXICON, type LexiconEntry, type LexiconRuleset, type LexiconTerm } from './lexicon'
import { ACT_TITLES, MAIN_ACTS, type ActId, type Quest } from './questCatalog'
import { isActDone, isActUnlocked, isJourneyDone, journeyProgress, nextQuest, questsOfAct, rankKey } from './questProgress'
import { useQuestStore } from './questStore'
import { useStartQuest } from './useStartQuest'

/** A wax seal: pressed in the trim colour once its act is done, a faint outline before. */
export function WaxSeal({ done, label, size = 36 }: { done: boolean; label: string; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={`quest-seal ${done ? 'is-done' : ''}`} role="img" aria-label={label}>
      <path
        d="M20 2.5c2.4 0 3.2 2.3 5.4 2.9 2.2.6 4.2-.9 6 .7 1.8 1.6.7 3.9 1.6 6 .9 2.1 3.5 2.7 3.5 5.1 0 2.4-2.4 3.2-2.9 5.4-.6 2.2.9 4.2-.7 6-1.6 1.8-3.9.7-6 1.6-2.1.9-2.7 3.5-5.1 3.5s-3.2-2.4-5.4-2.9c-2.2-.6-4.2.9-6-.7-1.8-1.6-.7-3.9-1.6-6C6 21 3.5 20.4 3.5 18c0-2.4 2.4-3.2 2.9-5.4.6-2.2-.9-4.2.7-6 1.6-1.8 3.9-.7 6-1.6C15.2 4.1 17.6 2.5 20 2.5Z"
        className="quest-seal-wax"
      />
      <circle cx="20" cy="20" r="10.5" className="quest-seal-ring" />
      <path d="M20 12.5 22.2 18 28 18.4 23.5 22 25 27.5 20 24.4 15 27.5 16.5 22 12 18.4 17.8 18Z" className="quest-seal-star" />
    </svg>
  )
}

/** A progress ring (0..1) around `children`. */
export function ProgressRing({ value, size = 44, children }: { value: number; size?: number; children?: ReactNode }) {
  const r = 16
  const c = 2 * Math.PI * r
  return (
    <span className="quest-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r={r} className="quest-ring-track" />
        <circle cx="20" cy="20" r={r} className="quest-ring-fill" style={{ strokeDasharray: c, strokeDashoffset: c * (1 - value) }} />
      </svg>
      <span className="quest-ring-inner">{children}</span>
    </span>
  )
}

function QuestRow({ quest, done, recommended, locked }: { quest: Quest; done: boolean; recommended: boolean; locked: boolean }) {
  const t = useT()
  const startQuest = useStartQuest()
  return (
    <li className={`quest-row ${done ? 'is-done' : ''} ${recommended ? 'is-next' : ''} ${locked ? 'is-locked' : ''}`}>
      <span className="quest-row-icon" aria-hidden>
        {locked ? '❔' : quest.icon}
      </span>
      <span className="quest-row-title">
        {locked ? t('quest.lockedTitle') : t(quest.title)}
        {recommended && <span className="quest-row-badge">{t('quest.recommended')}</span>}
        {quest.practice && !locked && <span className="quest-row-practice" title={t('quest.practiceBadgeHint')}>{t('quest.practiceBadge')}</span>}
      </span>
      {!locked && (
        <button type="button" className="quest-btn is-small" onClick={() => void startQuest(quest.id)}>
          {done ? t('quest.replay') : t('quest.startQuest')}
        </button>
      )}
      {done && <span className="sr-only">{t('quest.doneLabel')}</span>}
    </li>
  )
}

function ActSection({ act, completed, nextId }: { act: ActId; completed: string[]; nextId?: string }) {
  const t = useT()
  const quests = questsOfAct(act)
  const done = act !== 'side' && isActDone(act, completed)
  const unlocked = isActUnlocked(act, completed)
  const count = quests.filter((q) => completed.includes(q.id)).length
  return (
    <section className={`quest-act ${done ? 'is-done' : ''}`}>
      <header className="quest-act-head">
        {act !== 'side' ? <WaxSeal done={done} label={t(done ? 'quest.sealDone' : 'quest.sealOpen', { act: t(ACT_TITLES[act]) })} size={30} /> : <span className="quest-act-paths" aria-hidden>🧭</span>}
        <h3 className="quest-act-title">{t(ACT_TITLES[act])}</h3>
        <span className="quest-act-count">
          {count}/{quests.length}
        </span>
      </header>
      {!unlocked && <p className="quest-act-locked">{t('quest.epilogueLocked')}</p>}
      <ul className="quest-act-list">
        {quests.map((q) => (
          <QuestRow key={q.id} quest={q} done={completed.includes(q.id)} recommended={q.id === nextId} locked={!unlocked} />
        ))}
      </ul>
    </section>
  )
}

/** The certificate, earned with the last main act: the hero's portrait, all seals, the date. */
function Certificate({ date }: { date: string }) {
  const t = useT()
  const { lang } = useI18n()
  const lastCharacter = useQuestStore((s) => s.lastCharacter)
  const hero = useVaultStore((s) => s.vault.characters.find((c) => c.frontmatter.name === lastCharacter)?.frontmatter)
  const when = new Date(date).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <section className="quest-certificate" aria-label={t('quest.certificateTitle')}>
      <div className="quest-certificate-portrait">
        {hero?.portrait_url ? <img src={hero.portrait_url} alt="" /> : <span aria-hidden>✦</span>}
      </div>
      <h3 className="quest-certificate-title">{t('quest.certificateTitle')}</h3>
      <p className="quest-certificate-text">{t('quest.certificateText', { name: hero?.name ?? t('quest.certificateNameless'), date: when })}</p>
      <div className="quest-certificate-seals">
        {MAIN_ACTS.map((act, i) => (
          <span key={act} style={{ '--i': i } as CSSProperties}>
            <WaxSeal done label={t('quest.sealDone', { act: t(ACT_TITLES[act]) })} size={28} />
          </span>
        ))}
      </div>
    </section>
  )
}

/** The compendium: every rules term the runes explain, for the open vault's rules. */
function Compendium() {
  const t = useT()
  const vaultRuleset = useVaultStore((s) => s.ruleset.ruleset)
  const ruleset: LexiconRuleset = vaultRuleset === 'endeavour' || vaultRuleset === 'nimble' ? 'endeavour' : 'dnd5e'
  const readTerms = useQuestStore((s) => s.readTerms)
  return (
    <div>
      <p className="quest-compendium-intro">{t(ruleset === 'endeavour' ? 'quest.compendiumIntroEndeavour' : 'quest.compendiumIntroDnd')}</p>
      {(Object.entries(LEXICON) as [LexiconTerm, LexiconEntry][]).filter(([, e]) => e.body[ruleset]).map(([term, entry]) => {
        const read = readTerms.includes(term)
        return (
          <details
            key={term}
            className="quest-lexicon-entry"
            onToggle={(e) => {
              if ((e.currentTarget as HTMLDetailsElement).open) useQuestStore.getState().markRead(term)
            }}
          >
            <summary>
              <span aria-hidden>{entry.icon}</span>
              <span className="flex-1">{t(entry.title)}</span>
              {!read && <span className="quest-lexicon-new">{t('quest.compendiumNew')}</span>}
            </summary>
            <p>{t(entry.body[ruleset]!)}</p>
          </details>
        )
      })}
    </div>
  )
}

/**
 * The quest log, a drawer from the right: the adventurer's rank and progress ring, every act with
 * its seal and quests (the recommended next one glowing), the side paths, the certificate once
 * earned, and the compendium of rules terms.
 */
export function QuestLog() {
  const t = useT()
  const section = useQuestStore((s) => s.log)
  const completed = useQuestStore((s) => s.completed)
  const journeyDoneAt = useQuestStore((s) => s.journeyDoneAt)
  const panelRef = useRef<HTMLDivElement>(null)
  const progress = journeyProgress(completed)
  const nextId = nextQuest(completed)?.id
  const close = () => useQuestStore.getState().closeLog()

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true })
  }, [])
  // Escape, or a press on the backdrop around the panel.
  useDismiss(true, close, [panelRef])

  return createPortal(
    <div className="quest-log-backdrop">
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t('quest.logTitle')} className="quest-log rpg-panel">
        <header className="quest-log-head">
          <ProgressRing value={progress} size={52}>
            <span className="font-num text-sm">{Math.round(progress * 100)}%</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h2 className="quest-log-title">{t('quest.logTitle')}</h2>
            <p className="quest-log-rank">{t(rankKey(progress))}</p>
          </div>
          <button type="button" className="quest-bubble-close" onClick={close} aria-label={t('quest.close')} title={t('quest.close')}>
            ✕
          </button>
        </header>

        <div role="tablist" className="quest-log-tabs">
          {(['quests', 'compendium'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={section === key}
              className="rpg-tab cursor-pointer"
              onClick={() => useQuestStore.getState().openLog(key)}
            >
              {t(key === 'quests' ? 'quest.tabQuests' : 'quest.tabCompendium')}
            </button>
          ))}
        </div>

        <div className="quest-log-body">
          {section === 'compendium' ? (
            <Compendium />
          ) : (
            <>
              {journeyDoneAt && isJourneyDone(completed) && <Certificate date={journeyDoneAt} />}
              {[...MAIN_ACTS, 'side' as const].map((act) => (
                <ActSection key={act} act={act} completed={completed} nextId={nextId} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
