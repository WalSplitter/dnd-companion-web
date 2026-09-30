import { describe, expect, it } from 'vitest'
import { addEntry, hasEntry, moveEntry, removeEntry } from './listInventory'

describe('addEntry', () => {
  it('appends a vault item to the chosen list, creating it if needed', () => {
    expect(addEntry(undefined, 'carried', '[[Seil]]')).toEqual({ carried: ['[[Seil]]'] })
    expect(addEntry({ equipped: ['[[Langschwert]]'] }, 'equipped', '[[Schild]]')).toEqual({ equipped: ['[[Langschwert]]', '[[Schild]]'] })
  })

  it('refuses an item already in that list, matching links case-insensitively and by alias target', () => {
    expect(addEntry({ carried: ['[[seil|Hanfseil]]'] }, 'carried', '[[Seil]]')).toBeUndefined()
    expect(hasEntry({ carried: [{ name: 'Seil' }] }, 'carried', '[[Seil]]')).toBe(true)
  })

  it('allows the same item in the other list', () => {
    expect(addEntry({ carried: ['[[Seil]]'] }, 'equipped', '[[Seil]]')).toEqual({ carried: ['[[Seil]]'], equipped: ['[[Seil]]'] })
  })
})

describe('removeEntry', () => {
  it('removes just the entry at that position, inline items included', () => {
    const inventory = { carried: ['[[Seil]]', { name: 'Fackel', quantity: 3 }, '[[Ration]]'] }
    expect(removeEntry(inventory, 'carried', 1)).toEqual({ carried: ['[[Seil]]', '[[Ration]]'] })
  })

  it('ignores a position that no longer exists', () => {
    expect(removeEntry({ carried: ['[[Seil]]'] }, 'carried', 3)).toBeUndefined()
    expect(removeEntry(undefined, 'equipped', 0)).toBeUndefined()
  })
})

describe('moveEntry', () => {
  it('moves an entry to the end of the other list, keeping inline item data', () => {
    const inventory = { equipped: ['[[Langschwert]]'], carried: [{ name: 'Fackel', quantity: 3 }, '[[Seil]]'] }
    expect(moveEntry(inventory, 'carried', 0)).toEqual({ equipped: ['[[Langschwert]]', { name: 'Fackel', quantity: 3 }], carried: ['[[Seil]]'] })
    expect(moveEntry(inventory, 'equipped', 0)).toEqual({ equipped: [], carried: [{ name: 'Fackel', quantity: 3 }, '[[Seil]]', '[[Langschwert]]'] })
  })

  it("doesn't duplicate a vault item already in the other list", () => {
    expect(moveEntry({ equipped: ['[[Seil]]'], carried: ['[[Seil]]'] }, 'carried', 0)).toEqual({ equipped: ['[[Seil]]'], carried: [] })
  })

  it('keeps other keys of the inventory block', () => {
    const inventory = { equipped: ['[[Seil]]'], notes: 'kept' } as unknown as Parameters<typeof moveEntry>[0]
    expect(moveEntry(inventory, 'equipped', 0)).toMatchObject({ notes: 'kept', carried: ['[[Seil]]'] })
  })
})
