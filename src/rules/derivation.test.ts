import { describe, expect, it } from 'vitest'
import { characterSkillBonus, initiativeBonus, passivePerception, spellAttackBonus, spellSaveDC } from './deriveStats'
import { derivationTotal, dndSaveDerivation, initiativeDerivation, passivePerceptionDerivation, skillDerivation, spellAttackDerivation, spellSaveDCDerivation } from './derivation'
import { savingThrowBonus } from './dnd5e'
import { ABILITIES, SKILLS, type CharacterFrontmatter } from '../vault/types'

const wizard: CharacterFrontmatter = {
  type: 'character',
  name: 'Test Wizard',
  ruleset: 'dnd5e',
  class: [{ name: 'Wizard', level: 5 }],
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
  hp: { current: 27, max: 38 },
  spellcasting: { ability: 'int' },
}

const arkanist: CharacterFrontmatter = {
  ...wizard,
  ruleset: 'endeavour',
  nimble_attributes: { st: -1, bw: 2, ko: 1, ge: 0, in: 1, vs: 3, pr: 0, en: 2 },
  nimble_skills: { arcana: 4, perception: 2 },
  conditions: { exhaustion: 1 },
}

describe('derivations', () => {
  it('add up to the value shown on the sheet, in both rulesets', () => {
    for (const c of [wizard, arkanist, { ...wizard, conditions: { exhaustion: 2 } }]) {
      for (const { key } of SKILLS) expect(derivationTotal(skillDerivation(c, key))).toBe(characterSkillBonus(c, key))
      expect(derivationTotal(initiativeDerivation(c))).toBe(initiativeBonus(c))
      expect(derivationTotal(passivePerceptionDerivation(c))).toBe(passivePerception(c))
      expect(derivationTotal(spellSaveDCDerivation(c) ?? [])).toBe(spellSaveDC(c))
      expect(derivationTotal(spellAttackDerivation(c) ?? [])).toBe(spellAttackBonus(c))
    }
    for (const { key } of ABILITIES) expect(derivationTotal(dndSaveDerivation(wizard, key))).toBe(savingThrowBonus(wizard, key))
  })

  it('names the parts of a D&D skill: ability, proficiency or expertise', () => {
    expect(skillDerivation(wizard, 'arcana')).toEqual([
      { kind: 'attribute', abbr: 'INT', value: 3 },
      { kind: 'expertise', value: 6 },
    ])
    expect(skillDerivation(wizard, 'history')[1]).toEqual({ kind: 'proficiency', value: 3 })
    expect(skillDerivation(wizard, 'athletics')).toEqual([{ kind: 'attribute', abbr: 'STR', value: -1 }])
  })

  it('names the Nimble attribute and the trained value, and leaves out proficiency', () => {
    expect(skillDerivation(arkanist, 'arcana')).toEqual([
      { kind: 'attribute', abbr: 'VS', value: 3 },
      { kind: 'skill', value: 4 },
    ])
    expect(spellSaveDCDerivation(arkanist)).toEqual([
      { kind: 'constant', value: 8 },
      { kind: 'attribute', abbr: 'VS', value: 3 },
      { kind: 'exhaustion', value: -2 },
    ])
  })

  it('has no spellcasting derivation for a non-caster', () => {
    const fighter = { ...wizard, spellcasting: undefined }
    expect(spellSaveDCDerivation(fighter)).toBeUndefined()
    expect(spellAttackDerivation(fighter)).toBeUndefined()
  })
})
