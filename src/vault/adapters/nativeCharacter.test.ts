import { describe, expect, it } from 'vitest'
import { normalizeNativeCharacter, parseEndeavourInventory, parseListInventory } from './nativeCharacter'

describe('parseEndeavourInventory', () => {
  it('keeps wikilinks, stacks and temporary items as they are', () => {
    const containers = [
      { container: '[[Rucksack]]', items: ['[[Seil]]', { link: '[[Fackel]]', charges: 3 }, { name: 'Krug', plaetze: 2 }] },
    ]
    expect(parseEndeavourInventory({ containers })).toEqual({ containers })
  })

  it('leaves out only what nothing can be made of: an empty `-` line, a number', () => {
    const parsed = parseEndeavourInventory({ containers: [{ container: '[[Rucksack]]', items: [null, 4, '', '[[Seil]]'] }] })
    expect(parsed).toEqual({ containers: [{ container: '[[Rucksack]]', items: ['[[Seil]]'] }] })
  })

  it('repairs hand-written entries instead of dropping them, keeping their other keys', () => {
    const parsed = parseEndeavourInventory({
      containers: [{ container: '[[Rucksack]]', items: [{ link: '[[Fackel]]', charges: '3' }, { link: '[[Seil]]', note: 'x' }, { quantity: 1 }, { name: 'Krug' }] }],
    })
    expect(parsed?.containers[0].items).toEqual([
      { link: '[[Fackel]]', charges: 3 },
      { link: '[[Seil]]', note: 'x', charges: 1 },
      { quantity: 1, name: '?', plaetze: 1 },
      { name: 'Krug', plaetze: 1 },
    ])
  })

  it('keeps the items of a container without a link, and its other keys', () => {
    const parsed = parseEndeavourInventory({ containers: [{ items: ['[[Seil]]'] }, { container: '[[Gürteltasche]]', label: 'links' }, 'kaputt'] })
    expect(parsed).toEqual({
      containers: [
        { container: '', items: ['[[Seil]]'] },
        { container: '[[Gürteltasche]]', label: 'links', items: [] },
      ],
    })
  })

  it('reads a single item written without `-` as a list of one', () => {
    expect(parseEndeavourInventory({ containers: [{ container: '[[Rucksack]]', items: '[[Seil]]' }] })?.containers[0].items).toEqual(['[[Seil]]'])
  })

  it('reads a block without containers as an empty inventory, and none as none', () => {
    expect(parseEndeavourInventory({})).toEqual({ containers: [] })
    expect(parseEndeavourInventory(undefined)).toBeUndefined()
  })
})

describe('parseListInventory', () => {
  it("keeps wikilinks and items, names a nameless one, and keeps the block's other keys", () => {
    const parsed = parseListInventory({ equipped: ['[[Schwert]]', null, ''], carried: [{ name: 'Brot', quantity: 2 }, 7, { quantity: 1 }], note: 'x' })
    expect(parsed).toEqual({ equipped: ['[[Schwert]]'], carried: [{ name: 'Brot', quantity: 2 }, { quantity: 1, name: '?' }], note: 'x' })
  })

  it('reads a single entry as a list of one, and a missing section as none', () => {
    expect(parseListInventory({ equipped: '[[Schwert]]' })).toEqual({ equipped: ['[[Schwert]]'], carried: undefined })
  })
})

describe('normalizeNativeCharacter: hand-edited lists', () => {
  it('drops empty lines from spells_known', () => {
    const raw = { path: 'Held.md', name: 'Held', data: { type: 'character', name: 'Held', spells_known: ['[[Feuerball]]', null, ' '] }, body: '' }
    expect(normalizeNativeCharacter(raw, []).spells_known).toEqual(['[[Feuerball]]'])
  })
})
