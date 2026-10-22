import { describe, expect, it } from 'vitest'
import { dieAtLevel, recoveryAmount } from './endeavourClasses'

describe('recoveryAmount', () => {
  it('gives all, half rounded up, or a flat amount', () => {
    expect(recoveryAmount('all', 5)).toBe(5)
    expect(recoveryAmount('half', 5)).toBe(3)
    expect(recoveryAmount(1, 5)).toBe(1)
  })
})

describe('dieAtLevel', () => {
  const die = { 1: '1W6', 6: '1W8', 18: '2W6' }
  it('takes the last step at or below the level', () => {
    expect(dieAtLevel(die, 1)).toBe('1W6')
    expect(dieAtLevel(die, 17)).toBe('1W8')
    expect(dieAtLevel(die, 20)).toBe('2W6')
  })
  it('has none below the first step or without a map', () => {
    expect(dieAtLevel({ 3: '1W6' }, 2)).toBeUndefined()
    expect(dieAtLevel(undefined, 5)).toBeUndefined()
    expect(dieAtLevel(['1W6'], 5)).toBeUndefined()
  })
})
