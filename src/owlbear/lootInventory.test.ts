import { describe, expect, it } from 'vitest'
import type { EndeavourItemFrontmatter } from '../vault/adapters/endeavourItem'
import type { CharacterFrontmatter, Vault, VaultFile } from '../vault/types'
import type { LootDrop } from './loot'
import { withLoot } from './lootInventory'

const item = (frontmatter: EndeavourItemFrontmatter): VaultFile<EndeavourItemFrontmatter> => ({ path: `${frontmatter.name}.md`, frontmatter, body: '' })

const vault: Vault = {
  characters: [],
  items: [],
  spells: [],
  notes: [],
  endeavourItems: [
    item({ name: 'Gürteltasche', kind: 'container', plaetze: 2, max_size: 'klein' }),
    item({ name: 'Rucksack', kind: 'container', plaetze: 14, max_size: 'gross' }),
    item({ name: 'Seil', kind: 'equipment', plaetze: 2 }),
    item({ name: 'Fackel', kind: 'equipment', plaetze: 1, stack_size: 4 }),
  ],
}

function character(overrides: Partial<CharacterFrontmatter> = {}): CharacterFrontmatter {
  return {
    type: 'character',
    name: 'Brann',
    class: [],
    species: '',
    background: '',
    alignment: '',
    experience: 0,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saving_throw_proficiencies: [],
    skill_proficiencies: [],
    armor_class: 0,
    speed: '',
    hp: { current: 10, max: 10 },
    ...overrides,
  }
}

const drop = (name: string, plaetze?: number): LootDrop => ({ id: '1', character: 'Brann', name, plaetze, from: 'GM', at: 1 })

const gridCharacter = (pouchItems: string[] = []) =>
  character({
    endeavour_inventory: {
      containers: [
        { container: '[[Gürteltasche]]', items: pouchItems },
        { container: '[[Rucksack]]', items: [] },
      ],
    },
    _write: { endeavour_inventory: { path: 'Brann.md' } },
  })

describe('withLoot', () => {
  it('puts an item note into the first container it fits in, as a link', () => {
    const change = withLoot(gridCharacter(['[[Seil]]']), vault, drop('seil'))
    expect(change).toEqual({
      kind: 'containers',
      containers: [
        { container: '[[Gürteltasche]]', items: ['[[Seil]]'] },
        { container: '[[Rucksack]]', items: ['[[Seil]]'] },
      ],
    })
  })

  it('places a stackable item as a full stack and anything else as a temporary item', () => {
    const stack = withLoot(gridCharacter(), vault, drop('Fackel'))
    expect(stack?.kind === 'containers' && stack.containers[0].items).toEqual([{ link: '[[Fackel]]', charges: 4 }])
    // Two slots make it too big for the belt pouch.
    const custom = withLoot(gridCharacter(), vault, drop('Goldene Statuette', 2))
    expect(custom?.kind === 'containers' && custom.containers.map((c) => c.items)).toEqual([[], [{ name: 'Goldene Statuette', plaetze: 2 }]])
  })

  it('adds to the carried list of a character without the slot grid', () => {
    const listed = character({ inventory: { carried: ['[[Seil]]'] }, _write: { inventory: { path: 'Brann.md' } } })
    expect(withLoot(listed, vault, drop('Fackel'))).toEqual({ kind: 'list', inventory: { carried: ['[[Seil]]', '[[Fackel]]'] } })
  })

  it('leaves the loot waiting where it has nowhere to go', () => {
    expect(withLoot(character(), vault, drop('Seil'))).toBeUndefined()
    expect(withLoot(character({ endeavour_inventory: { containers: [] }, _write: { endeavour_inventory: { path: 'Brann.md' } } }), vault, drop('Seil'))).toBeUndefined()
  })
})
