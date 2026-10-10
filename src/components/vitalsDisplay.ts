import type { TranslateFn } from '../i18n/useI18n'
import { exhaustionLevel } from '../rules/deriveStats'
import type { CharacterFrontmatter } from '../vault/types'

/** HP bar colour follows how hurt the character is, like a game HUD: healthy → bloodied → critical. */
export function hpFillClass(pct: number): string {
  if (pct > 50) return 'from-success/60 to-success'
  if (pct > 25) return 'from-warning/60 to-warning'
  return 'from-danger/60 to-danger'
}

/** Tooltip for the movement plate: squares per turn, plus the exhaustion malus when there is one. */
export function movementHint(t: TranslateFn, character: CharacterFrontmatter, squares: number): string {
  const n = exhaustionLevel(character)
  return n > 0
    ? t('stats.movementHintExhausted', { count: squares, speed: character.speed, n })
    : t('stats.movementHint', { count: squares, speed: character.speed })
}
