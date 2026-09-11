import { describe, expect, it } from 'vitest'
import { buildVaultIndex, resolveItemLink, resolveSpellLink, wikilinkTarget } from './wikilinks'
import type { Vault } from './types'

describe('wikilinkTarget', () => {
  it('strips the [[ ]] wrapper', () => {
    expect(wikilinkTarget('[[Fire Bolt]]')).toBe('Fire Bolt')
  })

  it('drops a pipe alias', () => {
    expect(wikilinkTarget('[[Fire Bolt|Fireball Cantrip]]')).toBe('Fire Bolt')
  })

  it('passes through plain strings unchanged', () => {
    expect(wikilinkTarget('Fire Bolt')).toBe('Fire Bolt')
  })
})

const vault: Vault = {
  characters: [],
  items: [
    { path: 'Items/Quarterstaff.md', frontmatter: { type: 'item', name: 'Quarterstaff' }, body: '' },
  ],
  spells: [
    { path: 'Spells/Fire Bolt.md', frontmatter: { type: 'spell', name: 'Fire Bolt', level: 0, school: 'Evocation', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' }, body: '' },
  ],
  notes: [],
}

describe('resolveItemLink / resolveSpellLink', () => {
  const index = buildVaultIndex(vault)

  it('resolves a matching wikilink case-insensitively', () => {
    expect(resolveItemLink(index, '[[quarterstaff]]')?.frontmatter.name).toBe('Quarterstaff')
    expect(resolveSpellLink(index, '[[Fire Bolt]]')?.frontmatter.name).toBe('Fire Bolt')
  })

  it('returns undefined for unresolved references', () => {
    expect(resolveItemLink(index, '[[Unknown Item]]')).toBeUndefined()
  })
})
