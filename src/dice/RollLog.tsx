import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n'
import { formatModifier } from '../rules/deriveStats'
import { D20Icon } from './D20Icon'
import type { RollMode } from './notation'
import { useRollLogStore, type RollLogEntry } from './rollLogStore'

const MODES: RollMode[] = ['normal', 'advantage', 'disadvantage']

/**
 * The sheet's roll log, like a game's combat log: a d20 at the end of the tab row (in the page's
 * flow, so it covers nothing until opened) drops down the last rolls of this session, newest on top. Its mode
 * switch arms advantage or disadvantage for the next d20 roll — what Shift/Alt+click do, for
 * phones and tablets that have neither key.
 */
export function RollLog() {
  const { t, lang } = useI18n()
  const entries = useRollLogStore((s) => s.entries)
  const armedMode = useRollLogStore((s) => s.armedMode)
  const setArmedMode = useRollLogStore((s) => s.setArmedMode)
  const clear = useRollLogStore((s) => s.clear)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const time = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' })
  const armed = armedMode !== 'normal'

  return (
    <div ref={rootRef} className="relative mb-1 shrink-0">
      {open && (
        <section
          role="dialog"
          aria-label={t('rollLog.title')}
          className="rpg-panel absolute right-0 top-full z-50 mt-2 flex max-h-[min(28rem,70vh)] w-[min(20rem,calc(100vw-2rem))] flex-col bg-surface shadow-2xl"
        >
          <header className="flex items-center justify-between gap-2 border-b border-trim/20 px-3 py-2">
            <h2 className="text-sm font-semibold text-fg">{t('rollLog.title')}</h2>
            {entries.length > 0 && (
              <button type="button" onClick={clear} className="cursor-pointer text-xs text-fg-muted hover:text-fg">
                {t('rollLog.clear')}
              </button>
            )}
          </header>

          <div className="border-b border-trim/20 px-3 py-2">
            <div role="radiogroup" aria-label={t('rollLog.nextRoll')} className="grid grid-cols-3 gap-1">
              {MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={armedMode === mode}
                  onClick={() => setArmedMode(mode)}
                  className={`cursor-pointer rounded-md border px-1.5 py-1 text-xs font-medium transition ${
                    armedMode === mode
                      ? mode === 'advantage'
                        ? 'border-success bg-success/15 text-success'
                        : mode === 'disadvantage'
                          ? 'border-danger bg-danger/15 text-danger'
                          : 'border-trim bg-trim/15 text-trim'
                      : 'border-trim/25 text-fg-muted hover:border-trim/60 hover:text-fg'
                  }`}
                >
                  {t(`rollLog.mode.${mode}`)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[0.7rem] leading-snug text-fg-muted">{t('rollLog.modeHint')}</p>
          </div>

          {entries.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-fg-muted">{t('rollLog.empty')}</p>
          ) : (
            <ol className="flex-1 divide-y divide-trim/10 overflow-y-auto" aria-live="polite">
              {entries.map((entry) => (
                <RollLogRow key={entry.id} entry={entry} time={time.format(entry.at)} />
              ))}
            </ol>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t('rollLog.title')}
        title={armed ? `${t('rollLog.title')} · ${t('rollLog.armed', { mode: t(`rollLog.mode.${armedMode}`) })}` : t('rollLog.title')}
        className={`roll-log-fab relative grid size-8 cursor-pointer place-items-center rounded-md border bg-surface-2 transition hover:shadow-[0_0_10px_-3px_var(--color-trim)] ${
          armedMode === 'advantage' ? 'border-success text-success' : armedMode === 'disadvantage' ? 'border-danger text-danger' : 'border-trim/50 text-trim'
        }`}
      >
        {/* Tumbles once for every new roll, so the corner die echoes the one that was clicked. */}
        <D20Icon key={entries[0]?.id ?? 0} rolling={entries.length > 0} />
        {armed && (
          <span className="absolute -right-1 -top-1 rounded-full bg-surface px-1 text-[0.6rem] font-bold leading-4 shadow">
            {t(`rollLog.badge.${armedMode as 'advantage' | 'disadvantage'}`)}
          </span>
        )}
        {!armed && entries.length > 0 && (
          <span className="font-num absolute -right-1 -top-1 min-w-4 rounded-full bg-trim px-1 text-[0.6rem] leading-4 text-surface">
            {entries.length}
          </span>
        )}
      </button>
    </div>
  )
}

function RollLogRow({ entry, time }: { entry: RollLogEntry; time: string }) {
  const { t } = useI18n()
  const tone = entry.kind === 'd20' && entry.critical ? 'text-success' : entry.fumble ? 'text-danger' : 'text-fg'

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span className={`font-num w-9 shrink-0 text-center text-xl ${tone}`}>{entry.total}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-fg">{entry.label}</span>
        <span className="block truncate text-[0.7rem] text-fg-muted">
          [{entry.rolls.join(', ')}]
          {entry.modifier ? ` ${formatModifier(entry.modifier)}` : ''}
          {entry.penalty ? <span className="text-danger">{` −${entry.penalty} ${t('roll.exhaustionShort')}`}</span> : null}
          {entry.mode && entry.mode !== 'normal' && ` · ${t(`roll.mode.${entry.mode}`)}`}
          {entry.kind === 'd20' && entry.critical && <span className="text-success">{` · ${t('roll.critical')}`}</span>}
          {entry.fumble && <span className="text-danger">{` · ${t('roll.fumble')}`}</span>}
        </span>
        {entry.effect && <span className="block truncate text-[0.7rem] font-semibold text-trim">{entry.effect}</span>}
      </span>
      <span className="shrink-0 text-right text-[0.65rem] leading-tight text-fg-muted">
        {entry.character && <span className="block max-w-20 truncate">{entry.character}</span>}
        <span className="block">{time}</span>
      </span>
    </li>
  )
}
