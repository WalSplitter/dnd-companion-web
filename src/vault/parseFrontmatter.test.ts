import { describe, expect, it } from 'vitest'
import { buildVault, FrontmatterValidationError, parseVaultFile } from './parseFrontmatter'

const characterFile = {
  path: 'Characters/Test.md',
  content: `---
type: character
name: Test Hero
class:
  - name: Fighter
    level: 3
species: Human
background: Soldier
alignment: Lawful Good
experience: 900
abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }
proficiency_bonus: 2
saving_throw_proficiencies: [str, con]
skill_proficiencies: [athletics]
armor_class: 16
speed: 30 ft
hp: { current: 28, max: 28 }
hit_dice: { die: d10, total: 3 }
---

Backstory text.
`,
}

const itemFile = {
  path: 'Items/Longsword.md',
  content: `---\ntype: item\nname: Longsword\ncategory: weapon\n---\nA martial melee weapon.`,
}

const notesFile = {
  path: 'Notes/Session 1.md',
  content: `---\ntype: note\ntitle: Session 1\n---\nUnrelated content.`,
}

describe('parseVaultFile', () => {
  it('parses a recognized frontmatter type', () => {
    const parsed = parseVaultFile(characterFile)
    expect(parsed?.frontmatter.type).toBe('character')
    expect(parsed?.frontmatter.name).toBe('Test Hero')
    expect(parsed?.body).toBe('Backstory text.')
  })

  it('returns null for unrecognized types', () => {
    expect(parseVaultFile(notesFile)).toBeNull()
  })

  it('throws for a missing name field', () => {
    expect(() => parseVaultFile({ path: 'bad.md', content: '---\ntype: item\n---\n' })).toThrow(
      FrontmatterValidationError,
    )
  })
})

describe('buildVault', () => {
  it('buckets files by type and skips non-markdown / unrecognized files', () => {
    const vault = buildVault([characterFile, itemFile, notesFile, { path: 'readme.txt', content: 'ignore me' }])
    expect(vault.characters).toHaveLength(1)
    expect(vault.items).toHaveLength(1)
    expect(vault.spells).toHaveLength(0)
  })
})
