import { describe, expect, it } from 'vitest'
import type { CharacterFrontmatter } from '../vault/types'
import { LINK_KEY, LIVE_KEY, readLink, readRoster, samePools, sameVitals, vitalsOf, withLiveVitals, type LiveVitals } from './live'

function character(overrides: Partial<CharacterFrontmatter> = {}): CharacterFrontmatter {
  return {
    type: 'character',
    name: 'Brann',
    class: [{ name: 'Krieger', level: 3 }],
    species: '',
    background: '',
    alignment: '',
    experience: 0,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saving_throw_proficiencies: [],
    skill_proficiencies: [],
    armor_class: 15,
    speed: '30 ft',
    hp: { current: 14, max: 21, temp: 5 },
    resilience: { current: 3, max: 12 },
    ...overrides,
  }
}

const live = (overrides: Partial<LiveVitals> = {}): LiveVitals => ({ ...vitalsOf(character()), by: 'conn-1', byName: 'GM', at: 1, ...overrides })

describe('vitalsOf', () => {
  it('takes HP, temp HP, resilience and armor class from the sheet', () => {
    expect(vitalsOf(character())).toEqual({ hp: 14, hpMax: 21, temp: 5, resilience: 3, resilienceMax: 12, ac: 15, perception: 10 })
  })

  it('counts missing temp HP as 0 and leaves out a missing resilience pool', () => {
    expect(vitalsOf(character({ hp: { current: 8, max: 10 }, resilience: undefined }))).toEqual({ hp: 8, hpMax: 10, temp: 0, ac: 15, perception: 10 })
  })

  it('takes mana and exhaustion along where the character has them', () => {
    const caster = character({ spellcasting: { ability: 'int', mana: { current: 5, max: 8 } }, conditions: { exhaustion: 2 } })
    expect(vitalsOf(caster)).toMatchObject({ mana: 5, manaMax: 8, exhaustion: 2 })
  })
})

describe('sameVitals', () => {
  it('tells a mana or exhaustion change apart, which samePools ignores', () => {
    const base = vitalsOf(character())
    expect(sameVitals(base, { ...base })).toBe(true)
    expect(sameVitals(base, { ...base, mana: 3, manaMax: 8 })).toBe(false)
    expect(sameVitals(base, { ...base, exhaustion: 1 })).toBe(false)
    expect(samePools(base, { ...base, exhaustion: 1 })).toBe(true)
  })
})

describe('samePools', () => {
  it('ignores the maxima and armor class, which a session does not change', () => {
    expect(samePools(vitalsOf(character()), live({ hpMax: 99, ac: 1 }))).toBe(true)
  })

  it('sees a change in HP, temp HP or resilience', () => {
    const base = vitalsOf(character())
    expect(samePools(base, live({ hp: 13 }))).toBe(false)
    expect(samePools(base, live({ temp: 0 }))).toBe(false)
    expect(samePools(base, live({ resilience: 2 }))).toBe(false)
  })
})

describe('withLiveVitals', () => {
  it('shows the live pools over the vault values', () => {
    const shown = withLiveVitals(character(), live({ hp: 9, temp: 0, resilience: 1 }))
    expect(shown.hp).toEqual({ current: 9, max: 21, temp: 0 })
    expect(shown.resilience).toEqual({ current: 1, max: 12 })
  })

  it('keeps the very same object when nothing differs, so memoized views stay put', () => {
    const c = character()
    expect(withLiveVitals(c, live())).toBe(c)
    expect(withLiveVitals(c, undefined)).toBe(c)
  })
})

describe('readRoster', () => {
  it('reads the entries under the companion key', () => {
    expect(readRoster({ [LIVE_KEY]: { Brann: live() } })).toEqual({ Brann: live() })
  })

  it('skips malformed entries and tolerates a missing roster', () => {
    expect(readRoster({ [LIVE_KEY]: { Brann: { hp: '14' }, Ilsa: null } })).toEqual({})
    expect(readRoster({})).toEqual({})
  })
})

describe('readLink', () => {
  it('reads the linked character of a token', () => {
    expect(readLink({ [LINK_KEY]: { character: 'Brann' } })).toEqual({ character: 'Brann' })
    expect(readLink({ other: 1 })).toBeUndefined()
  })
})
