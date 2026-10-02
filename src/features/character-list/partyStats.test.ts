import { describe, expect, it } from 'vitest'
import { bestValue, partyAggregate, radarDomain } from './partyStats'

describe('radarDomain', () => {
  it('spans at least −2…+4 so typical parties share a stable scale', () => {
    expect(radarDomain([-1, 0, 3])).toEqual([-2, 4])
  })

  it('widens to the values the party actually reaches', () => {
    expect(radarDomain([-4, 2, 5])).toEqual([-4, 5])
  })
})

describe('partyAggregate', () => {
  it('takes the best and the average value per attribute', () => {
    expect(partyAggregate([[3, -1], [1, 2], [-1, 2]])).toEqual({ max: [3, 2], mean: [1, 1] })
  })
})

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
