import type { Lang } from './useI18n'

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "3 hours ago" / "vor 3 Stunden" — the largest whole unit between `timestamp` and `now`. */
export function formatRelativeTime(timestamp: number, lang: Lang, now = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  const seconds = (timestamp - now) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(0, 'minute')
}
