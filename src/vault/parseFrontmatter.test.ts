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

  it('points endeavour_inventory write-back at the character file when it carries the field inline', () => {
    const withInventory = {
      path: 'Characters/Test.md',
      content: characterFile.content.replace(
        'hit_dice: { die: d10, total: 3 }',
        'hit_dice: { die: d10, total: 3 }\nendeavour_inventory:\n  containers: []',
      ),
    }
    const vault = buildVault([withInventory])
    expect(vault.characters[0].frontmatter._write?.endeavour_inventory).toEqual({ path: 'Characters/Test.md' })
  })

  it('points endeavour_inventory write-back at a linked sheet, matched by filename via Charakter, when the character file has no inline field', () => {
    const linkedInventory = {
      path: 'Characters/Test Inventar.md',
      content: '---\nCharakter: "[[Test]]"\nendeavour_inventory:\n  containers:\n    - container: "[[Rucksack]]"\n      items: []\n---\n',
    }
    const vault = buildVault([characterFile, linkedInventory])
    const character = vault.characters[0]
    expect(character.frontmatter._write?.endeavour_inventory).toEqual({ path: 'Characters/Test Inventar.md' })
    expect(character.frontmatter.endeavour_inventory).toEqual({ containers: [{ container: '[[Rucksack]]', items: [] }] })
  })

  it('leaves endeavour_inventory write-back unset when neither the character file nor a linked sheet carries the field', () => {
    const vault = buildVault([characterFile])
    expect(vault.characters[0].frontmatter._write?.endeavour_inventory).toBeUndefined()
  })

  it('resolves a portrait attachment reference against the loaded image assets', () => {
    const withPortrait = {
      path: 'Characters/Test.md',
      content: characterFile.content.replace('name: Test Hero', 'name: Test Hero\nportrait: "[[Test Portrait.jpg]]"'),
    }
    const imageAssets = new Map([['test portrait.jpg', 'blob:mock-url']])
    const vault = buildVault([withPortrait], imageAssets)
    expect(vault.characters[0].frontmatter.portrait_url).toBe('blob:mock-url')
  })

  it('leaves portrait_url undefined when there is no portrait field or no matching asset', () => {
    const vault = buildVault([characterFile], new Map())
    expect(vault.characters[0].frontmatter.portrait_url).toBeUndefined()
  })

  it('takes primary attributes from the class note, accepting keys, abbreviations and full names', () => {
    const classNote = { path: 'Klassen/Fighter.md', content: '---\nPrimärattribute: [ST, ko, Geschick, Unsinn]\n---\n' }
    const vault = buildVault([characterFile, classNote])
    expect(vault.characters[0].frontmatter.nimble_primary_attributes).toEqual(['st', 'ko', 'ge'])
  })

  it('leaves primary attributes unset when no class note declares any', () => {
    const vault = buildVault([characterFile])
    expect(vault.characters[0].frontmatter.nimble_primary_attributes).toBeUndefined()
  })

  describe('Nimble characters', () => {
    const nimbleCharacter = (extra = '') => ({
      path: 'Characters/Nimble.md',
      content: `---
type: character
name: Nimble Hero
class:
  - name: Prüfling
    level: 3
    subclass: Wächter
species: Homunkulus
background: Laborgeschöpf
alignment: Neutral
experience: 0
abilities: { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 }
proficiency_bonus: 2
saving_throw_proficiencies: []
skill_proficiencies: []
nimble_attributes: { st: 0, bw: 4, ko: 2, ge: 0, in: 0, vs: 0, pr: 0, en: 3 }
armor_class: 10
speed: 30 ft
hp: { current: 5, max: 99 }
resilience: { current: 4, max: 99 }
hit_dice: { die: d8, total: 3 }
${extra}---
`,
    })
    const classNote = { path: 'Klassen/Prüfling.md', content: '---\nTP_pro_Stufe: 4\nRP_pro_Stufe: 2\n---\n' }
    const subclassNote = { path: 'Klassen/Wächter.md', content: '---\nTP_pro_Stufe: 1\n---\n' }
    const chainShirt = {
      path: 'Gegenstände/Rüstung/Kettenhemd.md',
      content: '---\ntags: [Gegenstand/Rüstung/Mittel]\nRK: 3\nBW_cap: 2\n---\n',
    }

    it('takes BW_cap from the linked armor note and ignores a bw_cap typed onto the sheet', () => {
      const vault = buildVault([nimbleCharacter('armor: "[[Kettenhemd]]"\nbw_cap: 5\n'), chainShirt])
      expect(vault.characters[0].frontmatter.bw_cap).toBe(2)
    })

    it('accepts the German Rüstung field as well', () => {
      const vault = buildVault([nimbleCharacter('Rüstung: "[[Kettenhemd]]"\n'), chainShirt])
      expect(vault.characters[0].frontmatter.armor).toBe('[[Kettenhemd]]')
      expect(vault.characters[0].frontmatter.bw_cap).toBe(2)
    })

    it('has no BW cap without worn armor', () => {
      const vault = buildVault([nimbleCharacter('bw_cap: 1\n'), chainShirt])
      expect(vault.characters[0].frontmatter.bw_cap).toBeUndefined()
    })

    it('drops hit dice and their write target', () => {
      const vault = buildVault([nimbleCharacter()])
      expect(vault.characters[0].frontmatter.hit_dice).toBeUndefined()
      expect(vault.characters[0].frontmatter._write?.hit_dice_remaining).toBeUndefined()
    })

    it('derives max TP/RP per level from class + subclass + attribute bonus', () => {
      const vault = buildVault([nimbleCharacter(), classNote, subclassNote])
      const { hp, resilience } = vault.characters[0].frontmatter
      // TP: 3 × (4 class + 1 subclass + 2 KO); RP: 3 × (2 class + 0 subclass + floor(3 EN / 2))
      expect(hp).toEqual({ current: 5, max: 21 })
      expect(resilience).toEqual({ current: 4, max: 9 })
    })

    it("keeps the sheet's own max when the class note declares no per-level values", () => {
      const vault = buildVault([nimbleCharacter()])
      expect(vault.characters[0].frontmatter.hp.max).toBe(99)
      expect(vault.characters[0].frontmatter.resilience?.max).toBe(99)
    })
  })
})
