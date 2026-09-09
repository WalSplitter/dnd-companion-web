import { describe, expect, it } from 'vitest'
import {
  abilityModifier,
  formatModifier,
  initiativeBonus,
  passivePerception,
  savingThrowBonus,
  skillBonus,
  skillProficiencyLevel,
  spellAttackBonus,
  spellSaveDC,
} from './deriveStats'
import type { CharacterFrontmatter } from './types'

const character: CharacterFrontmatter = {
  type: 'character',
  name: 'Test Wizard',
  class: [{ name: 'Wizard', level: 5, subclass: 'School of Evocation' }],
  species: 'Elf',
  background: 'Sage',
  alignment: 'Neutral Good',
  experience: 6500,
  abilities: { str: 8, dex: 14, con: 13, int: 17, wis: 12, cha: 10 },
  proficiency_bonus: 3,
  saving_throw_proficiencies: ['int', 'wis'],
  skill_proficiencies: ['arcana', 'history', 'perception'],
  skill_expertise: ['arcana'],
  armor_class: 12,
  speed: '30 ft',
  hp: { current: 27, max: 38, temp: 0 },
  hit_dice: { die: 'd6', total: 5, used: 1 },
  spellcasting: { ability: 'int' },
}

describe('abilityModifier', () => {
  it('rounds down for odd scores', () => {
    expect(abilityModifier(8)).toBe(-1)
    expect(abilityModifier(10)).toBe(0)
    expect(abilityModifier(11)).toBe(0)
    expect(abilityModifier(17)).toBe(3)
  })
})

describe('formatModifier', () => {
  it('adds a leading + for non-negative values', () => {
    expect(formatModifier(3)).toBe('+3')
    expect(formatModifier(0)).toBe('+0')
    expect(formatModifier(-1)).toBe('-1')
  })
})

describe('savingThrowBonus', () => {
  it('adds the proficiency bonus only for proficient saves', () => {
    expect(savingThrowBonus(character, 'int')).toBe(6) // +3 mod, proficient (+3)
    expect(savingThrowBonus(character, 'str')).toBe(-1) // -1 mod, not proficient
  })
})

describe('skillBonus / skillProficiencyLevel', () => {
  it('doubles the proficiency bonus for expertise', () => {
    expect(skillProficiencyLevel(character, 'arcana')).toBe('expertise')
    expect(skillBonus(character, 'arcana')).toBe(9) // +3 int mod + 2*3 pb
  })

  it('applies the proficiency bonus once for plain proficiency', () => {
    expect(skillProficiencyLevel(character, 'perception')).toBe('proficient')
    expect(skillBonus(character, 'perception')).toBe(4) // +1 wis mod + 3 pb
  })

  it('applies no bonus without proficiency', () => {
    expect(skillProficiencyLevel(character, 'stealth')).toBe('none')
    expect(skillBonus(character, 'stealth')).toBe(2) // +2 dex mod
  })
})

describe('initiativeBonus', () => {
  it('equals the dexterity modifier', () => {
    expect(initiativeBonus(character)).toBe(2)
  })
})

describe('passivePerception', () => {
  it('is 10 plus the perception skill bonus', () => {
    expect(passivePerception(character)).toBe(14)
  })
})

describe('spell save DC / attack bonus', () => {
  it('is derived from the spellcasting ability', () => {
    expect(spellSaveDC(character)).toBe(14) // 8 + 3 pb + 3 int mod
    expect(spellAttackBonus(character)).toBe(6) // 3 pb + 3 int mod
  })

  it('is undefined for non-casters', () => {
    const nonCaster = { ...character, spellcasting: undefined }
    expect(spellSaveDC(nonCaster)).toBeUndefined()
    expect(spellAttackBonus(nonCaster)).toBeUndefined()
  })
})
