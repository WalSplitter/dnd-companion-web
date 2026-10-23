import type { ReactNode } from 'react'
import { useD20Penalty } from '../dice/d20Penalty'
import { useT } from '../i18n/useI18n'
import { passivePerceptionDerivation, spellSaveDCDerivation, type DerivationTerm } from '../rules/derivation'
import { exhaustionStaticPenalty, formatModifier, passivePerception, spellSaveDC } from '../rules/deriveStats'
import type { CharacterFrontmatter } from '../vault/types'
import { derivationText } from './derivationText'
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

/** A static value that stands in for a d20 test, with its derivation as the tooltip ("Passive
 * Wahrnehmung 12. 10 + IN +1 + Fertigkeit +1 = 12"), marked when exhaustion lowered it. */
function StaticValue({ label, value, derivation, exhausted, className }: { label: string; value: number; derivation: DerivationTerm[]; exhausted: boolean; className: string }) {
  const t = useT()
  const hint = `${label} ${value}. ${derivationText(t, derivation)}`
  if (!exhausted) return <span className={className} title={hint}>{value}</span>
  return (
    <ExhaustedValue className={className} hint={hint}>
      {value}
    </ExhaustedValue>
  )
}

/** The spell save DC (already lowered by exhaustion, see `spellSaveDC`), marked when it is. */
export function SpellSaveDCValue({ character, className = '' }: { character: CharacterFrontmatter; className?: string }) {
  const t = useT()
  const dc = spellSaveDC(character)
  const derivation = spellSaveDCDerivation(character)
  if (dc === undefined || !derivation) return <span className={className}>—</span>
  return <StaticValue label={t('stats.saveDC')} value={dc} derivation={derivation} exhausted={exhaustionStaticPenalty(character) > 0} className={className} />
}

/** Passive Perception (already lowered by exhaustion, see `passivePerception`), marked when it is. */
export function PassivePerceptionValue({ character, className = '' }: { character: CharacterFrontmatter; className?: string }) {
  const t = useT()
  return (
    <StaticValue
      label={t('stats.passivePerception')}
      value={passivePerception(character)}
      derivation={passivePerceptionDerivation(character)}
      exhausted={exhaustionStaticPenalty(character) > 0}
      className={className}
    />
  )
}
