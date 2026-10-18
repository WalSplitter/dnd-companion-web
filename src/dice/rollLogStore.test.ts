import { beforeEach, describe, expect, it } from 'vitest'
import { resolveRollMode, useRollLogStore } from './rollLogStore'

const entries = () => useRollLogStore.getState().entries
const keys = { shift: false, alt: false }

describe('resolveRollMode', () => {
  it('lets Shift and Alt force the mode', () => {
    expect(resolveRollMode({ ...keys, shift: true, armed: 'disadvantage', base: 'disadvantage' })).toBe('advantage')
    expect(resolveRollMode({ ...keys, alt: true, armed: 'advantage', base: 'advantage' })).toBe('disadvantage')
  })

  it('uses whichever of armed and base mode is set', () => {
    expect(resolveRollMode({ ...keys, armed: 'normal', base: 'advantage' })).toBe('advantage')
    expect(resolveRollMode({ ...keys, armed: 'disadvantage', base: 'normal' })).toBe('disadvantage')
    expect(resolveRollMode({ ...keys, armed: 'advantage', base: 'advantage' })).toBe('advantage')
  })

  it('cancels advantage against disadvantage', () => {
    expect(resolveRollMode({ ...keys, armed: 'disadvantage', base: 'advantage' })).toBe('normal')
  })
})

describe('rollLogStore', () => {
  beforeEach(() => useRollLogStore.getState().clear())

  it('puts the newest roll first and labels it with the roller', () => {
    const { add } = useRollLogStore.getState()
    add('Aldric', { kind: 'd20', label: 'first', total: 5, rolls: [5], modifier: 0 })
    add('Borin', { kind: 'damage', label: 'second', total: 7, rolls: [4, 3], modifier: 0 })
    expect(entries().map((e) => [e.label, e.character])).toEqual([
      ['second', 'Borin'],
      ['first', 'Aldric'],
    ])
  })

  it('keeps only the newest 30 rolls', () => {
    const { add } = useRollLogStore.getState()
    for (let i = 0; i < 35; i++) add('', { kind: 'd20', label: `r${i}`, total: i, rolls: [i], modifier: 0 })
    expect(entries()).toHaveLength(30)
    expect(entries()[0].label).toBe('r34')
  })
})
