import { describe, expect, it } from 'vitest'
import type { EndeavourItemFrontmatter } from '../../vault/adapters/endeavourItem'
import type { CharacterFrontmatter, EndeavourContainerSlotAssignment, Vault, VaultFile } from '../../vault/types'
import { buildVaultIndex } from '../../vault/wikilinks'
import { equipFromInventory, equippedWeapons, equipNew, equipSlotOf, setEquippedCharges, stowLink, unequip } from './equipment'

function item(frontmatter: EndeavourItemFrontmatter): VaultFile<EndeavourItemFrontmatter> {
  return { path: `${frontmatter.name}.md`, frontmatter, body: '' }
}

const index = buildVaultIndex({
  characters: [],
  items: [],
  spells: [],
  notes: [],
  endeavourItems: [
    item({ kind: 'container', name: 'Rucksack', plaetze: 4, max_size: 'gross' }),
    item({ kind: 'container', name: 'Gürteltasche', plaetze: 1, max_size: 'klein' }),
    item({ kind: 'armor', name: 'Lederrüstung', rk: 2, plaetze: 2 }),
    item({ kind: 'armor', name: 'Schuppenpanzer', rk: 5, plaetze: 3 }),
    item({ kind: 'shield', name: 'Holzschild', rk: 1, plaetze: 2 }),
    item({ kind: 'weapon', weapon_kind: 'melee', name: 'Dolch', plaetze: 1 }),
    item({ kind: 'weapon', weapon_kind: 'thrown', name: 'Wurfmesser', plaetze: 1, stack_size: 4 }),
    item({ kind: 'equipment', name: 'Seil', plaetze: 1 }),
  ],
} satisfies Vault)

function character(containers: EndeavourContainerSlotAssignment[], extra: Partial<CharacterFrontmatter> = {}): CharacterFrontmatter {
  return { endeavour_inventory: { containers }, attack_entries: [], ...extra } as unknown as CharacterFrontmatter
}

const backpack = (...items: EndeavourContainerSlotAssignment['items']) => ({ container: '[[Rucksack]]', items })
const pouch = (...items: EndeavourContainerSlotAssignment['items']) => ({ container: '[[Gürteltasche]]', items })

describe('equipSlotOf', () => {
  it('maps armor, shields and weapons to their slot and nothing else', () => {
    expect(equipSlotOf({ kind: 'armor', name: 'a' })).toBe('armor')
    expect(equipSlotOf({ kind: 'shield', name: 's' })).toBe('shield')
    expect(equipSlotOf({ kind: 'weapon', weapon_kind: 'melee', name: 'w' })).toBe('weapon')
    expect(equipSlotOf({ kind: 'equipment', name: 'e' })).toBeUndefined()
  })
})

describe('equipFromInventory', () => {
  it('moves armor out of its container onto the character', () => {
    const result = equipFromInventory(character([backpack('[[Seil]]', '[[Lederrüstung]]')]), index, 0, 1)
    expect(result).toEqual({ ok: true, change: { armor: '[[Lederrüstung]]', containers: [backpack('[[Seil]]')], first: 'character' }, equipped: { slot: 'armor' } })
  })

  it('swaps the armor worn before back into the same container', () => {
    const result = equipFromInventory(character([backpack('[[Schuppenpanzer]]')], { armor: '[[Lederrüstung]]' }), index, 0, 0)
    expect(result).toEqual({ ok: true, change: { armor: '[[Schuppenpanzer]]', containers: [backpack('[[Lederrüstung]]')], first: 'character' }, equipped: { slot: 'armor' } })
  })

  it('counts the slots the newly equipped item frees for the swap', () => {
    const c = character([backpack('[[Holzschild]]', '[[Seil]]', '[[Seil]]')], { shield: '[[Holzschild]]' })
    expect(equipFromInventory(c, index, 0, 0)).toEqual({
      ok: true,
      change: { shield: '[[Holzschild]]', containers: [backpack('[[Seil]]', '[[Seil]]', '[[Holzschild]]')], first: 'character' },
      equipped: { slot: 'shield' },
    })
  })

  it('refuses the swap when the old armor has nowhere to go', () => {
    // Taking the 2-slot leather armor out leaves 2 free slots — too few for the 3-slot scale mail,
    // and the pouch only takes small items.
    const c = character([backpack('[[Lederrüstung]]', '[[Seil]]', '[[Seil]]'), pouch()], { armor: '[[Schuppenpanzer]]' })
    expect(equipFromInventory(c, index, 0, 0)).toEqual({ ok: false, reason: 'no_room', name: 'Schuppenpanzer' })
  })

  it('appends a weapon to the attacks, keeping written-out attacks', () => {
    const written = { name: 'Klaue', damage_dice: '1d4' }
    const result = equipFromInventory(character([pouch('[[Dolch]]')], { attack_entries: [written] }), index, 0, 0)
    expect(result).toEqual({ ok: true, change: { attack_entries: [written, '[[Dolch]]'], containers: [pouch()], first: 'character' }, equipped: { slot: 'weapon', position: 1 } })
  })

  it('moves a whole stack, charges and all, into the attacks', () => {
    const result = equipFromInventory(character([pouch({ link: '[[Wurfmesser]]', charges: 3 })]), index, 0, 0)
    expect(result).toEqual({
      ok: true,
      change: { attack_entries: [{ link: '[[Wurfmesser]]', charges: 3 }], containers: [pouch()], first: 'character' },
      equipped: { slot: 'weapon', position: 0 },
    })
  })

  it('merges a stack into an equipped stack of the same weapon, overflowing into a new one', () => {
    const c = character([pouch({ link: '[[Wurfmesser]]', charges: 3 })], { attack_entries: ['[[Dolch]]', { link: '[[Wurfmesser]]', charges: 2 }] })
    expect(equipFromInventory(c, index, 0, 0)).toMatchObject({
      ok: true,
      change: { attack_entries: ['[[Dolch]]', { link: '[[Wurfmesser]]', charges: 4 }, { link: '[[Wurfmesser]]', charges: 1 }] },
      equipped: { slot: 'weapon', position: 2 },
    })
  })

  it('refuses plain gear and temporary items', () => {
    const c = character([backpack('[[Seil]]', { name: 'Zauberbuch', plaetze: 2 })])
    expect(equipFromInventory(c, index, 0, 0)).toMatchObject({ ok: false, reason: 'not_equippable', name: 'Seil' })
    expect(equipFromInventory(c, index, 0, 1)).toMatchObject({ ok: false, reason: 'not_equippable', name: 'Zauberbuch' })
  })
})

describe('equipNew', () => {
  it('equips a search result without touching the inventory', () => {
    expect(equipNew(character([backpack()]), index, '[[Holzschild]]')).toEqual({
      ok: true,
      change: { shield: '[[Holzschild]]', containers: [backpack()], first: 'character' },
      equipped: { slot: 'shield' },
    })
  })
})

describe('unequip', () => {
  it('stows armor into the backpack before the pouches and clears the slot', () => {
    const result = unequip(character([pouch(), backpack()], { armor: '[[Lederrüstung]]' }), index, { slot: 'armor' })
    expect(result).toEqual({ ok: true, change: { armor: null, containers: [pouch(), backpack('[[Lederrüstung]]')], first: 'inventory' } })
  })

  it('removes just the one weapon entry', () => {
    const c = character([backpack()], { attack_entries: ['[[Dolch]]', '[[Dolch]]'] })
    expect(unequip(c, index, { slot: 'weapon', position: 1 })).toMatchObject({ ok: true, change: { attack_entries: ['[[Dolch]]'], containers: [backpack('[[Dolch]]')] } })
  })

  it('stows into the container it was dropped on, or fails there', () => {
    const c = character([backpack(), pouch()], { armor: '[[Lederrüstung]]', attack_entries: ['[[Dolch]]'] })
    expect(unequip(c, index, { slot: 'weapon', position: 0 }, 1)).toMatchObject({ ok: true, change: { containers: [backpack(), pouch('[[Dolch]]')] } })
    expect(unequip(c, index, { slot: 'armor' }, 1)).toEqual({ ok: false, reason: 'too_big', name: 'Lederrüstung' })
  })

  it('keeps the item equipped when no container has room', () => {
    const c = character([backpack('[[Schuppenpanzer]]', '[[Seil]]')], { armor: '[[Lederrüstung]]' })
    expect(unequip(c, index, { slot: 'armor' })).toEqual({ ok: false, reason: 'no_room', name: 'Lederrüstung' })
  })
})

describe('equipped stacks', () => {
  it('unequips a stack with all its charges, topping up a partial stack first', () => {
    const c = character([backpack({ link: '[[Wurfmesser]]', charges: 2 })], { attack_entries: [{ link: '[[Wurfmesser]]', charges: 3 }] })
    expect(unequip(c, index, { slot: 'weapon', position: 0 })).toEqual({
      ok: true,
      change: { attack_entries: [], containers: [backpack({ link: '[[Wurfmesser]]', charges: 4 }, { link: '[[Wurfmesser]]', charges: 1 })], first: 'inventory' },
    })
  })

  it('adjusts the charges of an equipped stack within 0..Stapelgroesse', () => {
    const c = character([], { attack_entries: ['[[Dolch]]', { link: '[[Wurfmesser]]', charges: 3 }] })
    expect(setEquippedCharges(c, index, 1, 2)).toEqual({ attack_entries: ['[[Dolch]]', { link: '[[Wurfmesser]]', charges: 2 }], first: 'character' })
    expect(setEquippedCharges(c, index, 1, 9)?.attack_entries?.[1]).toEqual({ link: '[[Wurfmesser]]', charges: 4 })
    expect(setEquippedCharges(c, index, 1, 0)).toEqual({ attack_entries: ['[[Dolch]]'], first: 'character' })
    expect(setEquippedCharges(c, index, 1, 3)).toBeUndefined()
    expect(setEquippedCharges(c, index, 0, 1)).toBeUndefined()
  })

  it('lists a stack among the equipped weapons with its charges', () => {
    const c = character([], { attack_entries: [{ name: 'Klaue' }, { link: '[[Wurfmesser]]', charges: 3 }] })
    expect(equippedWeapons(c)).toEqual([{ position: 1, link: '[[Wurfmesser]]', charges: 3 }])
  })
})

describe('stowLink', () => {
  it('tops up a partial stack of the same item before taking a new slot', () => {
    const containers = [pouch({ link: '[[Wurfmesser]]', charges: 3 })]
    expect(stowLink(containers, index, '[[Wurfmesser]]')).toEqual({ ok: true, containers: [pouch({ link: '[[Wurfmesser]]', charges: 4 })] })
  })

  it('starts a new one-unit stack when every stack is full', () => {
    const containers = [backpack({ link: '[[Wurfmesser]]', charges: 4 })]
    expect(stowLink(containers, index, '[[Wurfmesser]]')).toEqual({
      ok: true,
      containers: [backpack({ link: '[[Wurfmesser]]', charges: 4 }, { link: '[[Wurfmesser]]', charges: 1 })],
    })
  })
})
