import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './relativeTime'

const NOW = Date.UTC(2026, 0, 10, 12)

describe('formatRelativeTime', () => {
  it('picks the largest whole unit', () => {
    expect(formatRelativeTime(NOW - 3 * 3600 * 1000, 'en', NOW)).toBe('3 hours ago')
    expect(formatRelativeTime(NOW - 2 * 24 * 3600 * 1000, 'de', NOW)).toBe('vorgestern')
  })

  it('treats anything under a minute as now', () => {
    expect(formatRelativeTime(NOW - 20_000, 'en', NOW)).toBe('this minute')
  })
})
