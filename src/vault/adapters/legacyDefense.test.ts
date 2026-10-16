import { describe, expect, it } from 'vitest'
import { parseRawFile } from '../rawFile'
import type { AbilityKey } from '../types'
import { resolveLegacyDefense } from './legacyDefense'

const gear = [
  parseRawFile({ path: 'Gegenstände/Rüstung/Rüstungen/Beschlagene Lederrüstung.md', content: '---\nRP: 2\nSR: 1\nDex_cap: 4\n---\n' }),
  parseRawFile({ path: 'Gegenstände/Rüstung/Rüstungen/Fellrüstung.md', content: '---\nRP: 2\nSR: 1\nDex_cap: 2\n---\n' }),
  parseRawFile({ path: 'Gegenstände/Rüstung/Rüstungen/Holzschild.md', content: '---\nRP: 2\nSR: 1\nDex_cap:\n---\n' }),
]

const abilities = (overrides: Partial<Record<AbilityKey, number>> = {}): Record<AbilityKey, number> => ({
  str: 10,
  dex: 18,
  con: 14,
  int: 10,
  wis: 16,
  cha: 10,
  ...overrides,
})

describe('resolveLegacyDefense', () => {
  it('reads the template revision: Rüstung/Schild at the top level, base 10', () => {
    const data = { Rüstung: '[[Beschlagene Lederrüstung]]', Schild: '[[Holzschild]]' }
    // 10 + DEX 4 (cap 4) + armor RP 2 + shield RP 2; SR 1 + 1
    expect(resolveLegacyDefense(data, abilities(), 'Kämpfer', gear)).toEqual({
      armorClass: 18,
      damageReduction: 2,
      armor: '[[Beschlagene Lederrüstung]]',
      shield: '[[Holzschild]]',
    })
  })

  it('reads the later revision: a Verteidigung block with natural armor and hand-typed bonuses', () => {
    const data = {
      Verteidigung: { Natürliche_Rüstung: 10, Zusätzliche_Rüstung: 1, Zusätzliche_SR: 1, Rüstung: '[[Fellrüstung]]', Schild: null },
    }
    // 10 + DEX 4 capped to 2 + RP 2 + 1; SR 1 + 1
    expect(resolveLegacyDefense(data, abilities(), 'Hexenmeister', gear)).toMatchObject({ armorClass: 15, damageReduction: 2, shield: undefined })
  })

  it('adds CON for a Barbarian without armor (Unarmored Defense), shield allowed', () => {
    const data = { Verteidigung: { Natürliche_Rüstung: 10, Rüstung: null, Schild: '[[Holzschild]]' } }
    // 10 + DEX 4 + CON 2 + shield RP 2
    expect(resolveLegacyDefense(data, abilities(), 'Barbar', gear).armorClass).toBe(18)
  })

  it('adds WIS for a Monk without armor, but not with a shield', () => {
    expect(resolveLegacyDefense({ Verteidigung: {} }, abilities(), 'Mönch', gear).armorClass).toBe(17)
    expect(resolveLegacyDefense({ Verteidigung: { Schild: '[[Holzschild]]' } }, abilities(), 'Mönch', gear).armorClass).toBe(16)
  })

  it('ignores Unarmored Defense while armor is worn', () => {
    expect(resolveLegacyDefense({ Verteidigung: { Rüstung: '[[Fellrüstung]]' } }, abilities(), 'Barbar', gear).armorClass).toBe(14)
  })

  it('uses base 13 for Mage Armor (InputData.MagierRüstung) without armor', () => {
    const data = { Verteidigung: { Natürliche_Rüstung: 10, Zusätzliche_Rüstung: 0 }, InputData: { MagierRüstung: true } }
    expect(resolveLegacyDefense(data, abilities({ dex: 13 }), 'Zauberer', gear).armorClass).toBe(14)
  })

  it('counts a linked armor note that is missing as armor without stats, and leaves out a zero damage reduction', () => {
    const result = resolveLegacyDefense({ Rüstung: '[[Mithrilhemd]]' }, abilities({ dex: 12 }), 'Schurke', gear)
    expect(result).toEqual({ armorClass: 11, damageReduction: undefined, armor: '[[Mithrilhemd]]', shield: undefined })
  })
})
