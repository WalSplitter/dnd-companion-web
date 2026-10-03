import { describe, expect, it } from 'vitest'
import { CLASH_KEYS, clashDiffers, readClash, writeClash } from './clash'

// Trimmed from a real token in Clash: current HP is a string there, the rest are numbers.
const token = () => ({
  'com.battle-system.clash/clash_id': '1d602a7a-8996-4a95-a959-6d85705a452d',
  'com.battle-system.clash/clash_currentHP': '4',
  'com.battle-system.clash/clash_maxHP': 4,
  'com.battle-system.clash/clash_armorClass': 10,
  'com.battle-system.clash/clash': true,
})

describe('readClash', () => {
  it('reads HP, max HP and armor class, whatever type Clash stored them as', () => {
    expect(readClash(token())).toEqual({ hp: 4, hpMax: 4, ac: 10 })
  })

  it('ignores tokens that are not in Clash or hold no numbers', () => {
    expect(readClash({ ...token(), [CLASH_KEYS.member]: undefined })).toBeUndefined()
    expect(readClash({ ...token(), [CLASH_KEYS.hp]: 'viel' })).toBeUndefined()
  })
})

describe('writeClash', () => {
  it('keeps the current HP a string, as Clash wrote it', () => {
    const metadata: Record<string, unknown> = token()
    writeClash(metadata, { hp: 21, hpMax: 30, ac: 15 })
    expect(metadata[CLASH_KEYS.hp]).toBe('21')
    expect(metadata[CLASH_KEYS.hpMax]).toBe(30)
    expect(metadata[CLASH_KEYS.ac]).toBe(15)
  })

  it('keeps a numeric current HP a number', () => {
    const metadata: Record<string, unknown> = { ...token(), [CLASH_KEYS.hp]: 4 }
    writeClash(metadata, { hp: 21, hpMax: 30, ac: 15 })
    expect(metadata[CLASH_KEYS.hp]).toBe(21)
  })
})

describe('clashDiffers', () => {
  it('compares HP, max HP and armor class', () => {
    expect(clashDiffers({ hp: 4, hpMax: 4, ac: 10 }, { hp: 4, hpMax: 4, ac: 10 })).toBe(false)
    expect(clashDiffers({ hp: 4, hpMax: 4, ac: 10 }, { hp: 3, hpMax: 4, ac: 10 })).toBe(true)
    expect(clashDiffers({ hp: 4, hpMax: 4, ac: 10 }, { hp: 4, hpMax: 5, ac: 10 })).toBe(true)
    expect(clashDiffers({ hp: 4, hpMax: 4, ac: 10 }, { hp: 4, hpMax: 4, ac: 11 })).toBe(true)
  })
})
