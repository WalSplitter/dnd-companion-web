import type { ReactNode } from 'react'
import { useD20Penalty } from '../dice/d20Penalty'
import { useT } from '../i18n/useI18n'
import { formatModifier, spellSaveDC, spellSaveDCPenalty } from '../vault/deriveStats'
import type { CharacterFrontmatter } from '../vault/types'
import { useExhaustedSync } from './exhaustedSync'

/**
 * A value lowered by exhaustion (rule `Erschöpfung`): it glows like an ember in crimson, and a small
 * blood drop — the same shape as the exhaustion track's tokens — hangs off its corner and drips now
 * and then — all of them in unison (see `useExhaustedSync`). The tooltip (`hint`) spells out the base value and the penalty.
 */
export function ExhaustedValue({ children, hint, className = '' }: { children: ReactNode; hint?: string; className?: string }) {
  const sync = useExhaustedSync()
  return (
    <span className={`exhausted-value ${className}`} title={hint} style={sync}>
      {children}
      <svg viewBox="0 0 24 24" className="exhausted-drop" aria-hidden>
        <path d="M12 2.5C9 7.2 5.5 10.8 5.5 14.8a6.5 6.5 0 0 0 13 0c0-4-3.5-7.6-6.5-12.3Z" fill="currentColor" />
      </svg>
    </span>
  )
}

/**
 * A d20 bonus as shown on the sheet: the base value minus the exhaustion penalty from
 * `D20PenaltyContext`, marked as exhausted when there is one. The roll buttons subtract the same
 * penalty themselves, so callers always pass the *base* value to both. `hint: false` leaves the
 * tooltip to an enclosing element that already explains the roll.
 */
export function D20Modifier({ value, className = '', hint = true }: { value: number; className?: string; hint?: boolean }) {
  const t = useT()
  const penalty = useD20Penalty()
  if (penalty <= 0) return <span className={className}>{formatModifier(value)}</span>
  const total = formatModifier(value - penalty)
  return (
    <ExhaustedValue className={className} hint={hint ? t('exhaustion.modifierHint', { base: formatModifier(value), n: penalty, total }) : undefined}>
      {total}
    </ExhaustedValue>
  )
}

/** The spell save DC (already lowered by exhaustion, see `spellSaveDC`), marked when it is. */
export function SpellSaveDCValue({ character, className = '' }: { character: CharacterFrontmatter; className?: string }) {
  const t = useT()
  const dc = spellSaveDC(character)
  const penalty = spellSaveDCPenalty(character)
  if (dc === undefined) return <span className={className}>—</span>
  if (penalty <= 0) return <span className={className}>{dc}</span>
  return (
    <ExhaustedValue className={className} hint={t('exhaustion.dcHint', { base: dc + penalty, n: penalty, total: dc })}>
      {dc}
    </ExhaustedValue>
  )
}
