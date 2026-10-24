import type { TranslateFn } from '../i18n/useI18n'
import { derivationTotal, type DerivationTerm } from '../rules/derivation'
import { formatModifier } from '../rules/deriveStats'
import type { LevelPoolPart } from '../vault/types'

function termText(t: TranslateFn, term: DerivationTerm): string {
  switch (term.kind) {
    case 'constant':
      return String(term.value)
    case 'attribute':
      return `${term.abbr} ${formatModifier(term.value)}`
    case 'exhaustion':
      return `${t('derivation.exhaustion')} ${-term.value}`
    default:
      return `${t(`derivation.${term.kind}`)} ${formatModifier(term.value)}`
  }
}

/**
 * A derivation as one formula line for a tooltip: "8 + IN +3 + Übung +2 − Erschöpfung 2 = 11".
 * A single term stands alone ("GE +2"), since "= +2" would only repeat it. The total is a modifier
 * ("= +5") unless the formula starts from a fixed base like a DC's 8.
 */
export function derivationText(t: TranslateFn, terms: DerivationTerm[]): string {
  const formula = terms.map((term, i) => (i === 0 ? '' : term.kind === 'exhaustion' ? ' − ' : ' + ') + termText(t, term)).join('')
  if (terms.length < 2) return formula
  const total = derivationTotal(terms)
  return `${formula} = ${terms.some((term) => term.kind === 'constant') ? total : formatModifier(total)}`
}

/**
 * Tooltip for a TP/RP maximum derived from the class notes (`level_pool_derivation`): one sentence
 * per class, "Krieger: (Stufe 3 + 1) × (Basis 6 + KO +2) = 32", after the maximum itself.
 * `attribute` names the per-level attribute bonus (`KO`, `EN/2`).
 */
export function levelPoolText(t: TranslateFn, label: string, max: number, parts: LevelPoolPart[], attribute: string): string {
  const classes = parts.map((p) => {
    const levels = t(p.levels > p.level ? 'derivation.levelDoubled' : 'derivation.level', { level: p.level })
    const perLevel = [`${t('derivation.base')} ${p.base}`, p.subclass ? `${t('derivation.subclass')} ${formatModifier(p.subclass)}` : undefined, `${attribute} ${formatModifier(p.attribute)}`]
      .filter(Boolean)
      .join(' + ')
    return `${p.className}: (${levels}) × (${perLevel}) = ${p.levels * (p.base + p.subclass + p.attribute)}`
  })
  return [t('derivation.poolMax', { label, max }), ...classes, t('derivation.poolNote')].join('. ')
}
