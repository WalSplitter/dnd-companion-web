import { describe, expect, it } from 'vitest'
import { isEndeavour, parseRuleset } from './ruleset'

describe('parseRuleset', () => {
  it('accepts the known rulesets in any case and with surrounding space', () => {
    expect(parseRuleset('dnd5e')).toBe('dnd5e')
    expect(parseRuleset(' Endeavour ')).toBe('endeavour')
  })

  it('rejects unknown values and non-strings', () => {
    expect(parseRuleset('nimble')).toBeUndefined()
    expect(parseRuleset(5)).toBeUndefined()
    expect(parseRuleset(undefined)).toBeUndefined()
  })
})

describe('isEndeavour', () => {
  it('follows the ruleset alone', () => {
    expect(isEndeavour({ ruleset: 'endeavour' })).toBe(true)
    expect(isEndeavour({ ruleset: 'dnd5e' })).toBe(false)
  })
})
