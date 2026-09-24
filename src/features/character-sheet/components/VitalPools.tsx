import type { MouseEvent, ReactNode } from 'react'
import { useT } from '../../../i18n/useI18n'
import { stepWithin } from '../vitals'

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

/** A blood drop, or for the last level (death) a skull. */
function ExhaustionGlyph({ skull }: { skull: boolean }) {
  return skull ? (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
      <path
        d="M12 2.5c-5 0-8.5 3.4-8.5 8 0 2.6 1.2 4.6 3 5.8V19a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 17.5 19v-2.7c1.8-1.2 3-3.2 3-5.8 0-4.6-3.5-8-8.5-8Z"
        fill="currentColor"
      />
      <circle cx="8.6" cy="11.2" r="2.1" className="exh-eye" />
      <circle cx="15.4" cy="11.2" r="2.1" className="exh-eye" />
      <path d="M12 13.6 10.9 15.8h2.2Z" className="exh-eye" />
      <path d="M9.5 18v2.2M12 18v2.2M14.5 18v2.2" stroke="var(--color-surface)" strokeWidth="1.1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
      <path d="M12 2.5C9 7.2 5.5 10.8 5.5 14.8a6.5 6.5 0 0 0 13 0c0-4-3.5-7.6-6.5-12.3Z" fill="currentColor" />
      <path d="M9.2 13.6c-.5 1.6.1 3.4 1.6 4.1" fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="1.3" strokeLinecap="round" className="exh-shine" />
    </svg>
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
      <div className="flex items-center justify-end gap-0.5" title={`${label}: ${level}/${max}`}>
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
