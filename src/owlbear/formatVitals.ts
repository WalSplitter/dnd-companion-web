import type { TranslateFn } from '../i18n/useI18n'
import type { Vitals } from './live'
import type { Initiative } from './table'

/** `14/21 TP +5 · RP 3/12` — the pools a session changes, compact enough for one line. */
export function formatPools(t: TranslateFn, vitals: Vitals): string {
  const hp = `${vitals.hp}/${vitals.hpMax} ${t('owlbear.hpShort')}${vitals.temp > 0 ? ` +${vitals.temp}` : ''}`
  const resilience = vitals.resilience !== undefined ? ` · ${t('owlbear.resilienceShort')} ${vitals.resilience}/${vitals.resilienceMax ?? '?'}` : ''
  return hp + resilience
}

/** `Mana 5/8 · PW 13 · Erschöpft 1` — what else the GM's overview shows of a character. */
export function formatExtras(t: TranslateFn, vitals: Vitals): string {
  return [
    vitals.mana !== undefined ? `${t('owlbear.manaShort')} ${vitals.mana}/${vitals.manaMax ?? '?'}` : null,
    vitals.perception !== undefined ? `${t('owlbear.perceptionShort')} ${vitals.perception}` : null,
    vitals.exhaustion ? t('owlbear.markerExhaustion', { level: vitals.exhaustion }) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** `Init 14 · 2 AP` — an initiative as rolled so far. */
export function formatInitiative(t: TranslateFn, initiative: Initiative): string {
  return [
    initiative.order !== undefined ? `${t('owlbear.initiativeShort')} ${initiative.order}` : null,
    initiative.ap !== undefined ? t('owlbear.actionPoints', { count: initiative.ap }) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
