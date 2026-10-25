import { describe, expect, it } from 'vitest'
import { normalizeNativeCharacter, parseEndeavourInventory, parseListInventory } from './nativeCharacter'

describe('parseEndeavourInventory', () => {
  it('keeps wikilinks, stacks and temporary items as they are', () => {
    const containers = [
      { container: '[[Rucksack]]', items: ['[[Seil]]', { link: '[[Fackel]]', charges: 3 }, { name: 'Krug', plaetze: 2 }] },
    ]
    expect(parseEndeavourInventory({ containers })).toEqual({ containers })
  })

  it("leaves out entries the grid can't read (an empty `-` line, a number, a half stack)", () => {
    const parsed = parseEndeavourInventory({ containers: [{ container: '[[Rucksack]]', items: [null, 4, '', '[[Seil]]', { link: '[[Fackel]]' }] }] })
    expect(parsed).toEqual({ containers: [{ container: '[[Rucksack]]', items: ['[[Seil]]'] }] })
  })

  it('keeps the items of a container without a link, and gives one without items none', () => {
    const parsed = parseEndeavourInventory({ containers: [{ items: ['[[Seil]]'] }, { container: '[[Gürteltasche]]' }, 'kaputt'] })
    expect(parsed).toEqual({
      containers: [
        { container: '', items: ['[[Seil]]'] },
        { container: '[[Gürteltasche]]', items: [] },
      ],
    })
  })

  it('reads a block without containers as an empty inventory, and none as none', () => {
    expect(parseEndeavourInventory({})).toEqual({ containers: [] })
    expect(parseEndeavourInventory(undefined)).toBeUndefined()
  })

  it('defaults a temporary item without a slot count to one slot', () => {
    expect(parseEndeavourInventory({ containers: [{ container: '[[Rucksack]]', items: [{ name: 'Krug' }] }] })?.containers[0].items).toEqual([{ name: 'Krug', plaetze: 1 }])
  })
})

describe('parseListInventory', () => {
  it("keeps wikilinks and named items, and the block's other keys", () => {
    const parsed = parseListInventory({ equipped: ['[[Schwert]]', null, ''], carried: [{ name: 'Brot', quantity: 2 }, 7, { quantity: 1 }], note: 'x' })
    expect(parsed).toEqual({ equipped: ['[[Schwert]]'], carried: [{ name: 'Brot', quantity: 2 }], note: 'x' })
  })

  it('treats a section that is no list as absent', () => {
    expect(parseListInventory({ equipped: '[[Schwert]]' })?.equipped).toBeUndefined()
  })
})

describe('normalizeNativeCharacter: hand-edited lists', () => {
  it('drops empty lines from spells_known', () => {
    const raw = { path: 'Held.md', name: 'Held', data: { type: 'character', name: 'Held', spells_known: ['[[Feuerball]]', null, ' '] }, body: '' }
    expect(normalizeNativeCharacter(raw, []).spells_known).toEqual(['[[Feuerball]]'])
  })
})
