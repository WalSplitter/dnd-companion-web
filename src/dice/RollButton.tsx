import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/useI18n'
import { formatModifier } from '../vault/deriveStats'
import { useD20Penalty } from './d20Penalty'
import { d20RollHint, damageRollHint } from './rollHint'
import { rollD20, rollDamage, type D20RollResult, type DiceRollResult, type RollMode } from './notation'

/** `penalty` is the part of a d20 result's modifier that came from `D20PenaltyContext` (exhaustion),
 * kept apart so the popover can show it separately from the roll's own bonus. */
type RollOutcome =
  | { kind: 'd20'; label: string; result: D20RollResult; penalty: number }
  | { kind: 'damage'; label: string; result: DiceRollResult }

/**
 * Rolls a d20 check/save/attack (click = normal, Shift+click = advantage, Alt+click =
 * disadvantage — 2024 rules: two d20s, keep higher/lower, never a third die) and shows the result
 * in a small popover next to the button. `modifier` may be negative, same as any 5e bonus.
 */
export function D20RollButton({
  label,
  modifier,
  className,
  title,
  note,
  children,
}: {
  label: string
  modifier: number
  className?: string
  /** One sentence for the default tooltip on what the roll decides, e.g. what it has to beat. */
  note?: string
  /** Tooltip; defaults to `d20RollHint` (what is rolled, the exhaustion breakdown, the Shift/Alt
   * keys). `false` renders none, for a button whose container already explains the roll. */
  title?: string | false
  /** Button content — defaults to a die icon; pass e.g. the formatted modifier to make a stat
   * tile's own number the clickable roll trigger instead of adding a separate icon next to it. */
  children?: React.ReactNode
}) {
  const t = useT()
  const penalty = useD20Penalty()
  const [outcome, setOutcome] = useState<RollOutcome | null>(null)

  function roll(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const mode: RollMode = e.shiftKey ? 'advantage' : e.altKey ? 'disadvantage' : 'normal'
    setOutcome({ kind: 'd20', label, result: rollD20({ mode, modifier: modifier - penalty }), penalty })
  }

  const fullTitle = title === false ? undefined : (title ?? d20RollHint(t, label, modifier, penalty, note))

  return (
    <RollButtonShell outcome={outcome} onClose={() => setOutcome(null)} onClick={roll} className={className} title={fullTitle}>
      {children ?? '🎲'}
    </RollButtonShell>
  )
}

/** Rolls damage dice (e.g. `"1d8"`) plus a flat bonus. `critical` doubles the dice, not the bonus. */
export function DamageRollButton({
  label,
  dice,
  bonus = 0,
  damageType,
  note,
  className,
  children,
}: {
  label: string
  dice: string
  bonus?: number
  damageType?: string
  /** One sentence for the tooltip on when and how the damage is rolled. */
  note?: string
  className?: string
  /** Button content — defaults to the formula (e.g. `1d6+2`). */
  children?: React.ReactNode
}) {
  const t = useT()
  const [outcome, setOutcome] = useState<RollOutcome | null>(null)

  function roll(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const critical = e.shiftKey
    const result = rollDamage(`${dice}${bonus ? formatModifier(bonus) : ''}`, { critical })
    if (result)
      setOutcome({
        kind: 'damage',
        label: `${label}${critical ? t('roll.critSuffix') : ''}${damageType ? ` · ${damageType}` : ''}`,
        result,
      })
  }

  return (
    <RollButtonShell outcome={outcome} onClose={() => setOutcome(null)} onClick={roll} className={className} title={damageRollHint(t, label, `${dice}${bonus ? formatModifier(bonus) : ''}`, note)}>
      {children ?? `${dice}${bonus ? formatModifier(bonus) : ''}`}
    </RollButtonShell>
  )
}

function RollButtonShell({
  children,
  outcome,
  onClick,
  onClose,
  className,
  title,
}: {
  children: React.ReactNode
  outcome: RollOutcome | null
  onClick: (e: React.MouseEvent) => void
  onClose: () => void
  className?: string
  title?: string
}) {
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!outcome) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [outcome, onClose])

  return (
    <span ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={
          className ??
          'cursor-pointer rounded-md border border-trim/30 bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-fg-muted transition hover:border-trim hover:text-trim hover:shadow-[0_0_10px_-3px_var(--color-trim)]'
        }
      >
        {children}
      </button>
      {outcome && <RollResultPopover outcome={outcome} onClose={onClose} />}
    </span>
  )
}

function RollResultPopover({ outcome, onClose }: { outcome: RollOutcome; onClose: () => void }) {
  const t = useT()
  const { result } = outcome
  const isD20 = outcome.kind === 'd20'
  const penalty = outcome.kind === 'd20' ? outcome.penalty : 0
  const ownModifier = result.modifier + penalty
  const crit = isD20 && (result as D20RollResult).isCriticalHit
  const fumble = isD20 && (result as D20RollResult).isCriticalMiss

  return (
    <span
      role="dialog"
      className="rpg-panel absolute left-1/2 top-full z-50 mt-1.5 w-48 -translate-x-1/2 bg-surface p-2.5 text-center shadow-xl"
    >
      <span className="mb-1 flex items-start justify-between gap-2 text-left">
        <span className="text-xs font-medium text-fg-muted">{outcome.label}</span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          className="text-xs text-fg-muted hover:text-fg"
          aria-label={t('common.close')}
        >
          ✕
        </button>
      </span>
      <span className={`block font-num text-3xl ${crit ? 'text-success' : fumble ? 'text-danger' : 'text-fg'}`}>{result.total}</span>
      <span className="mt-0.5 block text-xs text-fg-muted">
        [{result.rolls.join(', ')}]
        {ownModifier ? ` ${formatModifier(ownModifier)}` : ''}
        {penalty > 0 && <span className="text-danger">{` −${penalty} ${t('roll.exhaustionShort')}`}</span>}
        {isD20 && (result as D20RollResult).mode !== 'normal' && ` · ${t(`roll.mode.${(result as D20RollResult).mode as 'advantage' | 'disadvantage'}`)}`}
      </span>
      {crit && <span className="mt-1 block text-xs font-semibold text-success">{t('roll.critical')}</span>}
      {fumble && <span className="mt-1 block text-xs font-semibold text-danger">{t('roll.fumble')}</span>}
    </span>
  )
}
