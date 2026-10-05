import { describe as suite, expect, it } from 'vitest'
import { AIM_COLORS, aimColor, burstColor, describe, type SharedRoll } from './rollMessage'

const roll = (change: Partial<SharedRoll> = {}): SharedRoll => ({
  character: 'Borin Eisenfaust',
  player: 'Michael',
  kind: 'damage',
  label: 'Langschwert',
  total: 4,
  rolls: [1],
  modifier: 3,
  ...change,
})

suite('describe', () => {
  it('names the character, the roll, its total and how it came about', () => {
    expect(describe(roll({ damageType: 'Hiebschaden' }))).toBe('⚔ Borin Eisenfaust · Langschwert · Hiebschaden: 4  [1] + 3')
  })

  it('marks d20 rolls, natural 20s and 1s, and negative modifiers', () => {
    expect(describe(roll({ kind: 'd20', label: 'Angriff', total: 21, rolls: [20], modifier: 1, critical: true }))).toBe('🎲 Borin Eisenfaust · Angriff: 21 ✦  [20] + 1')
    expect(describe(roll({ kind: 'd20', label: 'Heimlichkeit', total: 0, rolls: [1], modifier: -1, fumble: true }))).toBe('🎲 Borin Eisenfaust · Heimlichkeit: 0 ✗  [1] − 1')
  })
})

suite('burstColor', () => {
  it('follows the damage type, red on a critical hit', () => {
    expect(burstColor({ damageType: 'Feuerschaden' })).toBe('#ff7a1a')
    expect(burstColor({ damageType: 'cold' })).toBe('#5cc8ff')
    expect(burstColor({ damageType: 'Feuerschaden', critical: true })).toBe('#ff4d4d')
    expect(burstColor({ damageType: 'Hiebschaden' })).toBe('#e8b84a')
  })
})

suite('aimColor', () => {
  it('sets attacks apart from every damage type, gold on a natural 20, grey on a 1', () => {
    expect(aimColor({})).toBe(AIM_COLORS.hit)
    expect(aimColor({ critical: true })).toBe(AIM_COLORS.critical)
    expect(aimColor({ fumble: true })).toBe(AIM_COLORS.fumble)
    for (const damageType of ['Feuer', 'Kälte', 'Blitz', 'Donner', 'Gift', 'Säure', 'Nekrotisch', 'Gleißend', 'Psychisch', 'Energie', 'Hieb']) {
      expect(burstColor({ damageType })).not.toBe(AIM_COLORS.hit)
    }
  })

  it('marks attacks in a fallback notification with a target', () => {
    expect(describe(roll({ kind: 'attack', label: 'Langschwert Angriff', total: 15, rolls: [12], modifier: 3 }))).toBe('🎯 Borin Eisenfaust · Langschwert Angriff: 15  [12] + 3')
  })
})
