import { describe, expect, it } from 'vitest'
import { partyAggregate, radarDomain } from './AttributeRadar'

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
