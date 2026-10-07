import { describe, expect, it } from 'vitest'
import { CLASH_KEYS, clashDiffers, clashTracksTemp, readClash, readClashTracked, renameInClash, writeClash } from './clash'

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
    writeClash(metadata, { hp: 21, hpMax: 30, ac: 15, temp: 0 })
    expect(metadata[CLASH_KEYS.hp]).toBe('21')
    expect(metadata[CLASH_KEYS.hpMax]).toBe(30)
    expect(metadata[CLASH_KEYS.ac]).toBe(15)
  })

  it('keeps a numeric current HP a number', () => {
    const metadata: Record<string, unknown> = { ...token(), [CLASH_KEYS.hp]: 4 }
    writeClash(metadata, { hp: 21, hpMax: 30, ac: 15, temp: 0 })
    expect(metadata[CLASH_KEYS.hp]).toBe(21)
  })
})

describe('clashDiffers', () => {
  it('compares HP, max HP and armor class', () => {
    const vitals = { hp: 4, hpMax: 4, ac: 10, temp: 0 }
    expect(clashDiffers({ hp: 4, hpMax: 4, ac: 10 }, vitals)).toBe(false)
    expect(clashDiffers({ hp: 4, hpMax: 4, ac: 10 }, { ...vitals, hp: 3 })).toBe(true)
    expect(clashDiffers({ hp: 4, hpMax: 4, ac: 10 }, { ...vitals, hpMax: 5 })).toBe(true)
    expect(clashDiffers({ hp: 4, hpMax: 4, ac: 10 }, { ...vitals, ac: 11 })).toBe(true)
  })

  it('compares temp HP only where Clash tracks them', () => {
    const vitals = { hp: 4, hpMax: 4, ac: 10, temp: 5 }
    expect(clashDiffers({ hp: 4, hpMax: 4, ac: 10 }, vitals)).toBe(false)
    expect(clashDiffers({ hp: 4, hpMax: 4, ac: 10, temp: 5 }, vitals)).toBe(false)
    expect(clashDiffers({ hp: 4, hpMax: 4, ac: 10, temp: 0 }, vitals)).toBe(true)
  })
})

describe('temp HP', () => {
  const withTemp = (value: unknown) => ({ ...token(), [CLASH_KEYS.temp]: value })

  it('are read once Clash shows the column, an empty field as 0', () => {
    expect(readClash(withTemp('7'))).toEqual({ hp: 4, hpMax: 4, ac: 10, temp: 7 })
    expect(readClash(withTemp(''))).toEqual({ hp: 4, hpMax: 4, ac: 10, temp: 0 })
    expect(readClash(token())).not.toHaveProperty('temp')
  })

  it('are written only where Clash tracks them, in the type it used', () => {
    const tracked: Record<string, unknown> = withTemp('7')
    writeClash(tracked, { hp: 4, hpMax: 4, ac: 10, temp: 3 })
    expect(tracked[CLASH_KEYS.temp]).toBe('3')

    const untracked: Record<string, unknown> = token()
    writeClash(untracked, { hp: 4, hpMax: 4, ac: 10, temp: 3 })
    expect(untracked).not.toHaveProperty(CLASH_KEYS.temp)
  })

  it('count as on for every token once one of them has them, and are written there as a string', () => {
    expect(clashTracksTemp([token(), withTemp('7')])).toBe(true)
    expect(clashTracksTemp([token(), token()])).toBe(false)
    expect(readClashTracked(token(), true)).toEqual({ hp: 4, hpMax: 4, ac: 10, temp: 0 })
    expect(readClashTracked(token(), false)).not.toHaveProperty('temp')

    const untracked: Record<string, unknown> = token()
    writeClash(untracked, { hp: 4, hpMax: 4, ac: 10, temp: 3 }, true)
    expect(untracked[CLASH_KEYS.temp]).toBe('3')
  })
})

describe('renameInClash', () => {
  it('renames units in Clash and leaves other tokens alone', () => {
    const unit: Record<string, unknown> = { ...token(), [CLASH_KEYS.name]: 'Knight 1 #D3cf47' }
    renameInClash(unit, 'Borin Eisenfaust')
    expect(unit[CLASH_KEYS.name]).toBe('Borin Eisenfaust')

    const other: Record<string, unknown> = {}
    renameInClash(other, 'Borin Eisenfaust')
    expect(other).toEqual({})
  })
})
