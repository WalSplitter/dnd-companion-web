import { describe, expect, it } from 'vitest'
import { bestValue } from './CharacterComparison'

describe('bestValue', () => {
  it('picks the highest value, ties included', () => {
    expect(bestValue([2, 5, 3])).toBe(5)
    expect(bestValue([5, 5, 3])).toBe(5)
  })

  it('highlights nothing when the whole party is level or only one value is known', () => {
    expect(bestValue([3, 3, 3])).toBeUndefined()
    expect(bestValue([4, undefined])).toBeUndefined()
    expect(bestValue([undefined, undefined])).toBeUndefined()
  })

  it('ignores characters without the value', () => {
    expect(bestValue([undefined, 1, -2])).toBe(1)
  })
})
