import type { TranslateFn } from '../i18n/useI18n'
import { formatModifier } from '../vault/deriveStats'

/**
 * The one tooltip text every d20 roll button shares, so each says what it rolls, how exhaustion
 * changed it, and which keys roll with advantage/disadvantage:
 * "Athletik: W20 −9. Grundwert +1, Erschöpfung −10. Klicken zum Würfeln · Shift = Vorteil · …".
 * An optional `note` (one sentence, no trailing period) explains what the roll is for.
 * Sentences on purpose — the TooltipLayer turns the first into the headline.
 */
export function d20RollHint(t: TranslateFn, label: string, modifier: number, penalty: number, note?: string): string {
  const head = t('roll.d20Head', { label, modifier: formatModifier(modifier - penalty) })
  const breakdown = penalty > 0 ? t('roll.penaltyBreakdown', { base: formatModifier(modifier), n: penalty }) : undefined
  return [head, breakdown, note, t('roll.tooltipD20')].filter(Boolean).join('. ')
}

/** Same for damage rolls: "Kurzschwert Schaden: 1d6+2. Klicken zum Würfeln · Shift = Kritisch". */
export function damageRollHint(t: TranslateFn, label: string, formula: string, note?: string): string {
  return [t('roll.damageHead', { label, formula }), note, t('roll.tooltipDamage')].filter(Boolean).join('. ')
}
