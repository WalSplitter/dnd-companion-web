import { describe, expect, it } from 'vitest'
import { parseDiceExpression, rollDamage } from '../../dice/notation'
import type { CharacterFrontmatter, SpellFrontmatter } from '../../vault/types'
import { isAreaSpell, resolveSpellFormula, spellCost, spellDamage, spellKeyValue, spellRollFlow, upcastDamage } from './spellRolls'

function spell(overrides: Partial<SpellFrontmatter> = {}): SpellFrontmatter {
  return { type: 'spell', name: 'Test', level: 1, school: '', casting_time: '', range: '18 m', components: [], duration: '', ...overrides }
}

function caster(spellcasting: CharacterFrontmatter['spellcasting'], level = 3): CharacterFrontmatter {
  return {
    class: [{ name: 'Arkanist', level }],
    abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
    nimble_attributes: { st: 0, bw: 0, ko: 0, ge: 0, in: 0, vs: 3, pr: 0, en: 0 },
    spellcasting,
  } as CharacterFrontmatter
}

describe('spellRollFlow', () => {
  it('a save spell is rolled by the DM, even with damage', () => {
    expect(spellRollFlow(spell({ save_ability: 'dex' }), '3d6')).toBe('save')
  })

  it('damage without a save is a spell attack', () => {
    expect(spellRollFlow(spell(), '1d10')).toBe('attack')
  })

  it('attack_roll: false marks a spell that always hits', () => {
    expect(spellRollFlow(spell({ attack_roll: false }), '3d4+3')).toBe('auto')
  })

  it('an area without a save damages everything in it', () => {
    expect(spellRollFlow(spell({ target_kind: 'aoe' }), '4d12')).toBe('auto')
  })

  it('no damage, no save: nothing to roll', () => {
    expect(spellRollFlow(spell(), undefined)).toBe('none')
  })
})

describe('isAreaSpell', () => {
  it.each(['Selbst (4,5-m-Kegel)', 'Radius 3 Meter'])('spots an area in the range "%s"', (range) => {
    expect(isAreaSpell(spell({ range }))).toBe(true)
  })

  it('spots `Ziel: AoE` and "Alle Kreaturen …"', () => {
    expect(isAreaSpell(spell({ target: 'AoE' }))).toBe(true)
    expect(isAreaSpell(spell({ target: 'Alle Kreaturen im Kegel' }))).toBe(true)
  })

  it('target_kind wins over the text', () => {
    expect(isAreaSpell(spell({ target: 'Alle Kreaturen', target_kind: 'single' }))).toBe(false)
  })
})

describe('dice expressions', () => {
  it('parses and merges several terms', () => {
    expect(parseDiceExpression('4d12+1d12+10-2')).toEqual({ dice: [{ count: 5, sides: 12 }], modifier: 8 })
  })

  it('rolls every die of a mixed formula', () => {
    const result = rollDamage('2d6+1d8+3')!
    expect(result.rolls).toHaveLength(3)
    expect(result.modifier).toBe(3)
  })
})

describe('spell formulas', () => {
  it('fills in KEY and LVL as bonus or dice count', () => {
    expect(resolveSpellFormula('1d12+KEY', { key: 3, level: 5 })).toBe('1d12+3')
    expect(resolveSpellFormula('1d12+KEY', { key: -1, level: 5 })).toBe('1d12-1')
    expect(resolveSpellFormula('KEY d20', { key: 3, level: 5 })).toBe('3d20')
    expect(resolveSpellFormula('1d20+LVL', { key: 3, level: 5 })).toBe('1d20+5')
  })

  it('adds the upcast part once per tier above', () => {
    expect(upcastDamage('4d12', '+1d12', 2)).toBe('6d12')
    expect(upcastDamage('4d10', '+10', 1)).toBe('4d10+10')
    expect(upcastDamage('4d10', '+10', 0)).toBe('4d10')
  })

  it('KEY is the Nimble spellcasting attribute on an Endeavour sheet', () => {
    expect(spellKeyValue(caster({ ability: 'int' }))).toBe(3)
  })

  it('spellDamage resolves placeholders and upcasting together', () => {
    const fm = spell({ level: 2, damage: '1d6+KEY', upcast_damage: '+KEY' })
    expect(spellDamage(caster({ ability: 'int' }), fm, 3)).toBe('1d6+6')
  })
})

describe('spellCost', () => {
  const manaCaster = (current: number) => caster({ ability: 'int', mana: { current, max: 12 } })

  it('costs its tier in mana by default', () => {
    expect(spellCost(manaCaster(9), spell({ level: 2 }), 3)).toMatchObject({ kind: 'mana', cost: 2, affordable: true, tiers: { min: 2, max: 3 } })
  })

  it('upcasting costs the chosen tier', () => {
    expect(spellCost(manaCaster(9), spell({ level: 1 }), 3, 3)).toMatchObject({ cost: 3 })
  })

  it('a tier above the unlocked one is locked', () => {
    expect(spellCost(manaCaster(9), spell({ level: 4 }), 3)).toMatchObject({ locked: true, affordable: false })
  })

  it('cantrips and utility spells are free', () => {
    expect(spellCost(manaCaster(9), spell({ level: 0 }), 3)).toBeUndefined()
    expect(spellCost(manaCaster(9), spell({ utility: true }), 3)).toBeUndefined()
  })

  it('without mana, a slot of the spell grade', () => {
    expect(spellCost(caster({ ability: 'int', slots: { 1: { max: 3, used: 1 } } }), spell(), 1)).toEqual({ kind: 'slot', grade: '1', affordable: true })
  })
})
