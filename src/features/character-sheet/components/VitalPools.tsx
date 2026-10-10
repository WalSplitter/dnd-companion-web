import type { MouseEvent, ReactNode } from 'react'
import { useT } from '../../../i18n/useI18n'
import { stepWithin } from '../../../rules/vitals'
import { ExhaustionGlyph } from '../../../components/ExhaustionGlyph'

/** Shift-click steps by this much instead of 1. */
const BIG_STEP = 5

/**
 * A small bevelled −/+ button for stepping a pool. Shift-click steps by 5. `onStep` gets the signed
 * delta; clamping to the pool's range is the caller's job.
 */
export function StepButton({
  direction,
  onStep,
  disabled,
  label,
  tone = 'trim',
}: {
  direction: -1 | 1
  onStep: (delta: number) => void
  disabled?: boolean
  label: string
  tone?: 'trim' | 'accent'
}) {
  const t = useT()
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e: MouseEvent) => onStep(direction * (e.shiftKey ? BIG_STEP : 1))}
      aria-label={t(direction < 0 ? 'a11y.decrease' : 'a11y.increase', { label })}
      title={t(direction < 0 ? 'a11y.decrease' : 'a11y.increase', { label })}
      className={`pool-step pool-step-${tone} grid size-6 shrink-0 cursor-pointer place-items-center rounded-md`}
    >
      <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
        <path d={direction < 0 ? 'M2 6h8' : 'M2 6h8M6 2v8'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  )
}

/**
 * Exhaustion as a row of wound tokens: blood drops, with a skull for the last, lethal level.
 * Clicking a token sets that level (clicking the current top level clears it); the −/+ buttons step
 * by one. Near the end the filled tokens throb like a heartbeat. Renders two grid cells (caption
 * with the current penalty underneath, then the tokens) through a `contents` wrapper.
 */
export function ExhaustionTrack({
  level,
  max,
  onChange,
  caption,
}: {
  level: number
  max: number
  onChange?: (next: number) => void
  caption: ReactNode
}) {
  const t = useT()
  const label = t('stats.exhaustion')
  const dead = level >= max
  const critical = !dead && level >= max - 1 && level > 0

  return (
    <div className={`exh-track contents ${critical ? 'is-critical' : ''} ${dead ? 'is-dead' : ''}`}>
      <div className="flex flex-col leading-tight">
        {caption}
        {level > 0 && (
          <span className="text-[0.65rem] font-semibold text-danger">
            {dead ? t('stats.dead') : t('stats.exhaustionPenalty', { n: level * 2 })}
          </span>
        )}
      </div>
      <div className="flex items-center justify-end gap-px sm:gap-0.5" title={`${label}: ${level}/${max}`}>
        {onChange && <StepButton direction={-1} label={label} disabled={level <= 0} onStep={(d) => onChange(stepWithin(level, d, 0, max))} />}
        {Array.from({ length: max }, (_, i) => {
          const filled = i < level
          const className = `exh-token size-5 ${filled ? 'is-filled' : ''} ${i === max - 1 ? 'is-skull' : ''}`
          const glyph = <ExhaustionGlyph skull={i === max - 1} />
          if (!onChange) return <span key={i} className={className}>{glyph}</span>
          return (
            <button
              key={i}
              type="button"
              aria-label={t('a11y.exhaustionLevel', { n: i + 1 })}
              aria-pressed={filled}
              onClick={() => onChange(level === i + 1 ? i : i + 1)}
              className={`${className} cursor-pointer`}
            >
              {glyph}
            </button>
          )
        })}
        {onChange && <StepButton direction={1} label={label} disabled={level >= max} onStep={(d) => onChange(stepWithin(level, d, 0, max))} />}
      </div>
    </div>
  )
}
