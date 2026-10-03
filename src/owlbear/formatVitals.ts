import type { TranslateFn } from '../i18n/useI18n'
import type { Vitals } from './live'

/** `14/21 TP +5 · RP 3/12` — the pools a session changes, compact enough for one line. */
export function formatPools(t: TranslateFn, vitals: Vitals): string {
  const hp = `${vitals.hp}/${vitals.hpMax} ${t('owlbear.hpShort')}${vitals.temp > 0 ? ` +${vitals.temp}` : ''}`
  const resilience = vitals.resilience !== undefined ? ` · ${t('owlbear.resilienceShort')} ${vitals.resilience}/${vitals.resilienceMax ?? '?'}` : ''
  return hp + resilience
}
