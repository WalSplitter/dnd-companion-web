import { describe, expect, it } from 'vitest'
import type { EndeavourItemFrontmatter } from '../../vault/adapters/endeavourItem'
import type { Vault, VaultFile } from '../../vault/types'
import { buildVaultIndex } from '../../vault/wikilinks'
import { containerCapacity, findBestFit, GRID_COLUMNS, layoutContainer } from './grid'

function endeavourItem(path: string, frontmatter: EndeavourItemFrontmatter): VaultFile<EndeavourItemFrontmatter> {
  return { path, frontmatter, body: '' }
}

function indexWith(...items: VaultFile<EndeavourItemFrontmatter>[]) {
  const vault: Vault = { characters: [], items: [], spells: [], notes: [], endeavourItems: items }
  return buildVaultIndex(vault)
}

describe('findBestFit', () => {
  it('places the first item at slot 0', () => {
    expect(findBestFit([false, false, false, false, false], 5, 2)).toBe(0)
  })

  it('skips already-occupied cells within a row', () => {
    const occupied = [true, true, false, false, false, false, false]
    expect(findBestFit(occupied, 7, 2)).toBe(2)
  })

  it('wraps to the next row instead of splitting an item across the row boundary', () => {
    // 7 columns; slots 5-6 free in row 0, but a 3-slot item shouldn't split into row 1.
    const occupied = new Array<boolean>(14).fill(false)
    occupied[0] = occupied[1] = occupied[2] = occupied[3] = occupied[4] = true
    expect(findBestFit(occupied, 14, 3, 7)).toBe(7)
  })

  it('returns null when the item cannot fit anywhere', () => {
    const occupied = new Array<boolean>(7).fill(true)
    expect(findBestFit(occupied, 7, 1, 7)).toBeNull()
  })

  it('returns null when the item is wider than the grid itself', () => {
    expect(findBestFit(new Array<boolean>(7).fill(false), 7, 8, 7)).toBeNull()
  })
})

describe('containerCapacity', () => {
  it("reads a container's Plaetze as its total capacity", () => {
    expect(containerCapacity({ name: 'Rucksack (Groß)', kind: 'container', plaetze: 15, max_size: 'gross' })).toBe(15)
  })
})

describe('layoutContainer', () => {
  it('places items in list order, first-fit', () => {
    const schaufel = endeavourItem('Schaufel.md', { name: 'Schaufel', kind: 'equipment', plaetze: 2 })
    const koecher = endeavourItem('Köcher.md', { name: 'Köcher', kind: 'equipment', plaetze: 1 })
    const index = indexWith(schaufel, koecher)

    const layout = layoutContainer(['[[Schaufel]]', '[[Köcher]]'], index, 15)

    expect(layout.tiles).toEqual([
      { linkIndex: 0, link: '[[Schaufel]]', item: schaufel, start: 0, length: 2 },
      { linkIndex: 1, link: '[[Köcher]]', item: koecher, start: 2, length: 1 },
    ])
    expect(layout.used).toBe(3)
    expect(layout.capacity).toBe(15)
    expect(layout.overflow).toEqual([])
  })

  it('treats an unresolved wikilink as a 1-slot tile rather than crashing', () => {
    const index = indexWith()
    const layout = layoutContainer(['[[Nichtvorhanden]]'], index, 5)
    expect(layout.tiles).toEqual([{ linkIndex: 0, link: '[[Nichtvorhanden]]', item: undefined, start: 0, length: 1 }])
  })

  it('moves entries that no longer fit into overflow instead of dropping them', () => {
    const zelt = endeavourItem('Zelt.md', { name: 'Zelt', kind: 'equipment', plaetze: 4 })
    const index = indexWith(zelt)
    const layout = layoutContainer(['[[Zelt]]', '[[Zelt]]'], index, GRID_COLUMNS)
    expect(layout.tiles).toHaveLength(1)
    expect(layout.overflow).toEqual([{ linkIndex: 1, link: '[[Zelt]]', item: zelt }])
  })
})
