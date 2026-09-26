import { describe, expect, it } from 'vitest'
import type { CharacterFrontmatter } from '../../vault/types'
import { applyRestChange, planRest, restChangeWrite, restKinds } from './rest'

function character(overrides: Partial<CharacterFrontmatter> = {}): CharacterFrontmatter {
  return {
    type: 'character',
    name: 'Test',
    class: [{ name: 'Prüfling', level: 3 }],
    species: '',
    background: '',
    alignment: '',
    experience: 0,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficiency_bonus: 2,
    saving_throw_proficiencies: [],
    skill_proficiencies: [],
    armor_class: 2,
    speed: '30 ft',
    hp: { current: 14, max: 21, temp: 5 },
    resilience: { current: 3, max: 12 },
    spellcasting: { ability: 'int', mana: { current: 1, max: 9 } },
    conditions: { exhaustion: 2 },
    ...overrides,
  }
}

const byKey = (kind: Parameters<typeof planRest>[1], c = character()) => Object.fromEntries(planRest(c, kind).map((ch) => [ch.grade ? `slot${ch.grade}` : ch.key, ch.to]))

describe('restKinds', () => {
  it('offers the three Endeavour rests to a character with resilience', () => {
    expect(restKinds(character())).toEqual(['breather', 'field', 'safe'])
  })

  it('offers the D&D long rest otherwise', () => {
    expect(restKinds(character({ resilience: undefined }))).toEqual(['long'])
  })
})

describe('planRest', () => {
  it('Verschnaufen: half the max RP, rounded down, nothing else', () => {
    expect(byKey('breather')).toEqual({ resilience: 9 })
  })

  it('Feldrast: all RP, 25 % max HP, half the max mana — exhaustion and temp HP stay', () => {
    // floor(21 × 0.25) = 5, floor(9 / 2) = 4
    expect(byKey('field')).toEqual({ resilience: 12, hp: 19, mana: 5 })
  })

  it('Sichere Rast: all RP, 50 % max HP, all mana, one exhaustion level, temp HP end', () => {
    expect(byKey('safe')).toEqual({ resilience: 12, hp: 21, temp: 0, mana: 9, exhaustion: 1 })
  })

  it('caps at max and leaves out pools that are already full', () => {
    const full = character({ hp: { current: 21, max: 21 }, resilience: { current: 12, max: 12 }, conditions: {} })
    expect(planRest(full, 'breather')).toEqual([])
  })

  it('refills half of each slot grade on a Feldrast', () => {
    const slotCaster = character({ spellcasting: { ability: 'int', slots: { 1: { max: 4, used: 4 }, 2: { max: 3, used: 1 } } } })
    // grade 1: 0 + 2; grade 2: 2 + 1 = 3
    expect(byKey('field', slotCaster)).toMatchObject({ slot1: 2, slot2: 3 })
  })

  it('D&D long rest: everything back, hit dice included', () => {
    const dnd = character({ resilience: undefined, hit_dice: { die: 'W8', total: 3, used: 2 }, spellcasting: undefined })
    expect(byKey('long', dnd)).toEqual({ hp: 21, temp: 0, exhaustion: 1, hitDice: 3 })
  })
})

describe('restChangeWrite / applyRestChange', () => {
  it('writes slots as used, not remaining', () => {
    const target = { path: 'Spell Sheet.md', keyPath: ['spellcasting', 'slots', '1', 'used'] }
    const write = restChangeWrite({ key: 'slot', grade: '1', from: 0, to: 3, max: 4 }, { spell_slots: { 1: target } })
    expect(write).toEqual({ target, value: 1 })
  })

  it('skips pools without a write target', () => {
    expect(restChangeWrite({ key: 'mana', from: 1, to: 5 }, {})).toBeUndefined()
  })

  it('applies a mana change to the character', () => {
    expect(applyRestChange(character(), { key: 'mana', from: 1, to: 5 }).spellcasting?.mana).toEqual({ current: 5, max: 9 })
  })
})
