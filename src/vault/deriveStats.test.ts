import { describe, expect, it } from 'vitest'
import {
  abilityModifier,
  evasionValue,
  exhaustionD20Penalty,
  movementSquares,
  formatModifier,
  initiativeBonus,
  nimbleAttributeValue,
  nimbleSkillBonus,
  nimbleSkillValue,
  speedInSquares,
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

describe('nimbleAttributeValue', () => {
  it('clamps to the rule range -5..+5', () => {
    const nimble = { ...character, nimble_attributes: { st: 7, bw: -9, ko: 3, ge: 0, in: 0, vs: 0, pr: 0, en: 0 } }
    expect(nimbleAttributeValue(nimble, 'st')).toBe(5)
    expect(nimbleAttributeValue(nimble, 'bw')).toBe(-5)
    expect(nimbleAttributeValue(nimble, 'ko')).toBe(3)
  })
})

describe('speedInSquares', () => {
  it('converts feet to 5-ft grid squares', () => {
    expect(speedInSquares('30 ft')).toBe(6)
    expect(speedInSquares('40 feet')).toBe(8)
    expect(speedInSquares('25')).toBe(5)
  })

  it('passes through values already in squares', () => {
    expect(speedInSquares('6 Felder')).toBe(6)
  })

  it('returns undefined for unparseable values', () => {
    expect(speedInSquares('unknown')).toBeUndefined()
    expect(speedInSquares('30 ft, fly 60 ft')).toBeUndefined()
  })
})

describe('evasionValue', () => {
  const nimble = { ...character, nimble_attributes: { st: 0, bw: 3, ko: 0, ge: 0, in: 0, vs: 0, pr: 0, en: 0 } }

  it('is 10 + BW', () => {
    expect(evasionValue(nimble)).toBe(13)
  })

  it("caps the BW part at the worn armor's BW_cap, but never raises it", () => {
    expect(evasionValue({ ...nimble, bw_cap: 2 })).toBe(12)
    expect(evasionValue({ ...nimble, bw_cap: 5 })).toBe(13)
  })

  it('applies a negative BW in full', () => {
    expect(evasionValue({ ...nimble, nimble_attributes: { ...nimble.nimble_attributes, bw: -2 }, bw_cap: 1 })).toBe(8)
  })

  it('is undefined without Nimble attributes', () => {
    expect(evasionValue(character)).toBeUndefined()
  })
})

describe('nimbleSkillValue / nimbleSkillBonus', () => {
  const nimble = {
    ...character,
    nimble_attributes: { st: 0, bw: 0, ko: 0, ge: 0, in: 2, vs: 0, pr: 0, en: 0 },
    nimble_skills: { perception: 14, insight: -3, survival: 4 },
  }

  it('caps a skill bonus at +10 and never goes below 0', () => {
    expect(nimbleSkillValue(nimble, 'perception')).toBe(10)
    expect(nimbleSkillValue(nimble, 'insight')).toBe(0)
    expect(nimbleSkillValue(nimble, 'survival')).toBe(4)
    expect(nimbleSkillValue(nimble, 'athletics')).toBe(0)
  })

  it('adds the capped skill bonus to the governing attribute', () => {
    expect(nimbleSkillBonus(nimble, 'perception')).toBe(12)
  })
})

describe('exhaustion (rule Erschöpfung)', () => {
  const exhausted = { ...character, conditions: { exhaustion: 3 } }
  const nimbleExhausted = { ...exhausted, nimble_attributes: { st: 0, bw: 0, ko: 0, ge: 0, in: 0, vs: 0, pr: 0, en: 0 } }

  it('takes twice the level off every d20 roll', () => {
    expect(exhaustionD20Penalty(character)).toBe(0)
    expect(exhaustionD20Penalty(exhausted)).toBe(6)
  })

  it('lowers the spell save DC by twice the level for Nimble characters only', () => {
    expect(spellSaveDC(exhausted)).toBe(14)
    expect(spellSaveDC(nimbleExhausted)).toBe(8)
  })

  it('costs one square (1.5 m) of movement per level, never below 0', () => {
    expect(movementSquares(character)).toBe(6)
    expect(movementSquares(exhausted)).toBe(3)
    expect(movementSquares({ ...character, conditions: { exhaustion: 9 } })).toBe(0)
  })
})
