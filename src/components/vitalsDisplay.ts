import type { TranslateFn } from '../i18n/useI18n'
import { movementMaluses } from '../rules/deriveStats'
import type { CharacterFrontmatter } from '../vault/types'

/** HP bar colour follows how hurt the character is, like a game HUD: healthy → bloodied → critical. */
export function hpFillClass(pct: number): string {
  if (pct > 50) return 'from-success/60 to-success'
  if (pct > 25) return 'from-warning/60 to-warning'
  return 'from-danger/60 to-danger'
}

/** Whether exhaustion or `Belastet` takes squares off the character's movement (the plate marks it). */
export function movementReduced(character: CharacterFrontmatter): boolean {
  const { exhaustion, encumbered } = movementMaluses(character)
  return exhaustion + encumbered > 0
}

/** Tooltip for the movement plate: squares per turn, plus each malus that takes squares off. */
export function movementHint(t: TranslateFn, character: CharacterFrontmatter, squares: number): string {
  const { exhaustion, encumbered } = movementMaluses(character)
  return [
    t('stats.movementHint', { count: squares, speed: character.speed }),
    exhaustion > 0 ? t('stats.movementExhausted', { n: exhaustion }) : undefined,
    encumbered > 0 ? t('stats.movementEncumbered', { n: encumbered }) : undefined,
  ]
    .filter(Boolean)
    .join('. ')
}
