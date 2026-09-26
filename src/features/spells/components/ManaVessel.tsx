import { useId, useState } from 'react'
import { EditableNumber } from '../../../components/EditableNumber'
import { useT } from '../../../i18n/useI18n'
import { useCanEdit, useVaultStore } from '../../../store/vaultStore'
import type { FieldWriteTarget } from '../../../vault/types'
import { percentOf, stepWithin } from '../../character-sheet/vitals'
import { StepButton } from '../../character-sheet/components/VitalPools'

/** Up to this many points the pool is drawn as one rune shard per point, above as a flowing bar. */
const MAX_SHARDS = 20

/** Wave surface two periods wide (48 units each), so sliding it by one period loops seamlessly. */
const WAVE = 'M0 0q12 -3.2 24 0t24 0t24 0t24 0V60H0Z'

/**
 * A glass sphere of mana: the liquid level follows the pool, its surface rolls in two offset waves,
 * a ring of runes slowly orbits the glass, and the whole orb breathes with light while charged.
 */
export function ManaOrb({ fraction, className = 'size-12' }: { fraction: number; className?: string }) {
  const id = useId()
  const clip = `${id}-clip`
  const liquid = `${id}-liquid`
  const glow = `${id}-glow`
  // Inner glass spans y = 6..42; an empty orb keeps a thin film at the bottom so it reads as a vessel.
  const level = 42 - 36 * Math.max(0, Math.min(1, fraction))

  return (
    <svg viewBox="0 0 48 48" className={`mana-orb ${fraction <= 0 ? 'is-empty' : ''} ${className}`} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <circle cx="24" cy="24" r="18" />
        </clipPath>
        <linearGradient id={liquid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--mana) 75%, white)' }} />
          <stop offset="12%" style={{ stopColor: 'var(--mana)' }} />
          <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--mana) 35%, black)' }} />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.55" r="0.5">
          <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--mana) 35%, transparent)' }} />
          <stop offset="100%" style={{ stopColor: 'transparent' }} />
        </radialGradient>
      </defs>

      {/* Orbiting rune ring. */}
      <g className="mana-orb-runes">
        <circle cx="24" cy="24" r="22.6" fill="none" strokeWidth="0.6" strokeDasharray="1.2 2.4" />
        <path d="M24 .6v2.6M47.4 24h-2.6M24 47.4v-2.6M.6 24h2.6" strokeWidth="1.2" strokeLinecap="round" />
        <path d="m40.5 7.5-1.6 1.6M7.5 40.5l1.6-1.6" strokeWidth="0.9" strokeLinecap="round" />
      </g>

      {/* Glass, liquid, surface. */}
      <circle cx="24" cy="24" r="19.2" className="mana-orb-rim" />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="0" width="48" height="48" className="mana-orb-void" />
        <circle cx="24" cy="30" r="20" fill={`url(#${glow})`} />
        <g className="mana-orb-level" style={{ transform: `translateY(${level}px)` }}>
          <path d={WAVE} className="mana-orb-wave-back" />
          <path d={WAVE} fill={`url(#${liquid})`} className="mana-orb-wave" />
        </g>
        <circle cx="18" cy="34" r="0.9" className="mana-orb-bubble" />
        <circle cx="28" cy="38" r="0.6" className="mana-orb-bubble is-late" />
        <circle cx="23" cy="36" r="0.7" className="mana-orb-bubble is-later" />
      </g>
      <path d="M13.5 15.5a13 13 0 0 1 8-6.4" className="mana-orb-shine" />
      <circle cx="31" cy="12.5" r="1" className="mana-orb-sparkle" />
    </svg>
  )
}

/** One mana point as an elongated rune shard: lit and glowing, or a hollow, dimmed outline. */
function ManaShard() {
  return (
    <svg viewBox="0 0 12 22" aria-hidden>
      <path d="M6 .8 11 11 6 21.2 1 11Z" className="mana-shard-body" />
      <path d="M6 .8V21.2M1 11h10" className="mana-shard-facet" />
      <path d="M6 7.5 7.6 11 6 14.5 4.4 11Z" className="mana-shard-core" />
    </svg>
  )
}

/**
 * The mana pool (Endeavour rules): a glowing orb that fills and empties with the pool, then one rune
 * shard per point (or a flowing bar for big pools), then −/value/+. Clicking a shard sets the pool
 * to it, like the spell-slot crystals; shards a change touched ignite or fade out.
 */
export function ManaVessel({
  mana,
  characterPath,
  writeTarget,
}: {
  mana: { current: number; max: number }
  characterPath?: string
  writeTarget?: FieldWriteTarget
}) {
  const t = useT()
  const canEdit = useCanEdit() && Boolean(characterPath && writeTarget)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const { current, max } = mana
  const pct = percentOf(current, max)
  const label = t('stats.mana')

  // Previous-value pattern: remember the last change so only the shards it touched animate.
  const [change, setChange] = useState({ from: current, to: current, id: 0 })
  if (change.to !== current) setChange({ from: change.to, to: current, id: change.id + 1 })

  const set = canEdit
    ? (next: number) =>
        void updateCharacterField(characterPath!, writeTarget, next, (c) =>
          c.spellcasting?.mana ? { ...c, spellcasting: { ...c.spellcasting, mana: { ...c.spellcasting.mana, current: next } } } : c,
        )
    : undefined

  const lo = Math.min(change.from, change.to)
  const hi = Math.max(change.from, change.to)
  const rising = change.to > change.from

  return (
    <div className={`mana-row ${current === 0 ? 'is-empty' : ''}`}>
      <span className="mana-orb-wrap" title={`${label}: ${current}/${max}`}>
        <ManaOrb fraction={max > 0 ? current / max : 0} />
        {change.id > 0 && <span key={change.id} className={`mana-orb-flash ${rising ? 'is-rising' : 'is-draining'}`} />}
      </span>

      {max <= MAX_SHARDS ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={current}>
          {Array.from({ length: max }, (_, i) => {
            const lit = i < current
            const touched = change.id > 0 && i >= lo && i < hi
            const className = `mana-shard ${lit ? 'is-lit' : 'is-spent'} ${touched ? (lit ? 'is-igniting' : 'is-fading') : ''}`
            const key = touched ? `${i}-${change.id}` : i
            if (!set) return <span key={key} className={className}><ManaShard /></span>
            return (
              <button
                key={key}
                type="button"
                aria-label={t('a11y.manaPoint', { n: i + 1 })}
                aria-pressed={lit}
                onClick={() => set(current === i + 1 ? i : i + 1)}
                className={`${className} is-editable`}
              >
                <ManaShard />
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mana-vessel" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={current}>
          <div className="mana-liquid" style={{ width: `${pct}%` }}>
            <span className="mana-wave" />
          </div>
          <div className="mana-glass" />
        </div>
      )}

      <div className="flex shrink-0 items-center gap-0.5">
        {set && <StepButton direction={-1} tone="accent" label={label} disabled={current <= 0} onStep={(d) => set(stepWithin(current, d, 0, max))} />}
        <span className="flex min-w-12 items-baseline justify-center font-num leading-none">
          {set ? (
            <EditableNumber
              key={current}
              value={current}
              max={max}
              onCommit={set}
              className="mana-number w-[1.9em] rounded bg-transparent px-0.5 text-center text-lg outline-1 outline-transparent transition-colors hover:bg-white/5 hover:outline-border focus:bg-surface-2"
            />
          ) : (
            <span className={`text-lg ${current === 0 ? 'text-fg-muted' : 'mana-number'}`}>{current}</span>
          )}
          <span className="text-xs text-fg-muted">/{max}</span>
        </span>
        {set && <StepButton direction={1} tone="accent" label={label} disabled={current >= max} onStep={(d) => set(stepWithin(current, d, 0, max))} />}
      </div>
    </div>
  )
}
