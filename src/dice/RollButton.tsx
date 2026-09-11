import { useEffect, useRef, useState } from 'react'
import { formatModifier } from '../vault/deriveStats'
import { rollD20, rollDamage, type D20RollResult, type DiceRollResult, type RollMode } from './notation'

type RollOutcome = { kind: 'd20'; label: string; result: D20RollResult } | { kind: 'damage'; label: string; result: DiceRollResult }

/**
 * Rolls a d20 check/save/attack (click = normal, Shift+click = advantage, Alt+click =
 * disadvantage — 2024 rules: two d20s, keep higher/lower, never a third die) and shows the result
 * in a small popover next to the button. `modifier` may be negative, same as any 5e bonus.
 */
export function D20RollButton({
  label,
  modifier,
  className,
  children,
}: {
  label: string
  modifier: number
  className?: string
  /** Button content — defaults to a die icon; pass e.g. the formatted modifier to make a stat
   * tile's own number the clickable roll trigger instead of adding a separate icon next to it. */
  children?: React.ReactNode
}) {
  const [outcome, setOutcome] = useState<RollOutcome | null>(null)

  function roll(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const mode: RollMode = e.shiftKey ? 'advantage' : e.altKey ? 'disadvantage' : 'normal'
    setOutcome({ kind: 'd20', label, result: rollD20({ mode, modifier }) })
  }

  return (
    <RollButtonShell
      outcome={outcome}
      onClose={() => setOutcome(null)}
      onClick={roll}
      className={className}
      title="Click to roll · Shift = advantage · Alt = disadvantage"
    >
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
  className,
}: {
  label: string
  dice: string
  bonus?: number
  damageType?: string
  className?: string
}) {
  const [outcome, setOutcome] = useState<RollOutcome | null>(null)

  function roll(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const critical = e.shiftKey
    const result = rollDamage(`${dice}${bonus ? formatModifier(bonus) : ''}`, { critical })
    if (result) setOutcome({ kind: 'damage', label: `${label}${critical ? ' (crit)' : ''}${damageType ? ` · ${damageType}` : ''}`, result })
  }

  return (
    <RollButtonShell outcome={outcome} onClose={() => setOutcome(null)} onClick={roll} className={className} title="Click to roll · Shift = critical">
      {dice}
      {bonus ? formatModifier(bonus) : ''}
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
  title: string
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
          'rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-fg-muted transition hover:border-primary hover:text-primary'
        }
      >
        {children}
      </button>
      {outcome && <RollResultPopover outcome={outcome} onClose={onClose} />}
    </span>
  )
}

function RollResultPopover({ outcome, onClose }: { outcome: RollOutcome; onClose: () => void }) {
  const { result } = outcome
  const isD20 = outcome.kind === 'd20'
  const crit = isD20 && (result as D20RollResult).isCriticalHit
  const fumble = isD20 && (result as D20RollResult).isCriticalMiss

  return (
    <span
      role="dialog"
      className="absolute left-1/2 top-full z-50 mt-1.5 w-48 -translate-x-1/2 rounded-lg border border-border bg-surface p-2.5 text-center shadow-lg"
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
          aria-label="Close"
        >
          ✕
        </button>
      </span>
      <span className={`block text-2xl font-bold ${crit ? 'text-success' : fumble ? 'text-danger' : 'text-fg'}`}>{result.total}</span>
      <span className="mt-0.5 block text-xs text-fg-muted">
        [{result.rolls.join(', ')}]
        {result.modifier ? ` ${formatModifier(result.modifier)}` : ''}
        {isD20 && (result as D20RollResult).mode !== 'normal' && ` · ${(result as D20RollResult).mode}`}
      </span>
      {crit && <span className="mt-1 block text-xs font-semibold text-success">Critical!</span>}
      {fumble && <span className="mt-1 block text-xs font-semibold text-danger">Fumble!</span>}
    </span>
  )
}
