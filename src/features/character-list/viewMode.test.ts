import { describe, expect, it } from 'vitest'
import { AUTO_LIST_FROM, resolveLayout } from './viewMode'

describe('resolveLayout', () => {
  it('auto shows cards for a small party and a list for a large one', () => {
    expect(resolveLayout('auto', 1)).toBe('cards')
    expect(resolveLayout('auto', AUTO_LIST_FROM - 1)).toBe('cards')
    expect(resolveLayout('auto', AUTO_LIST_FROM)).toBe('list')
    expect(resolveLayout('auto', 8)).toBe('list')
  })

  it('an explicit choice wins over the party size', () => {
    expect(resolveLayout('cards', 8)).toBe('cards')
    expect(resolveLayout('list', 2)).toBe('list')
  })
})
