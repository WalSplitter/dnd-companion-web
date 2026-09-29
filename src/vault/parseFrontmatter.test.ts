import { describe, expect, it } from 'vitest'
import { buildVault, FrontmatterValidationError } from './parseFrontmatter'

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

describe('buildVault — native schema', () => {
  it('parses a recognized frontmatter type with its body', () => {
    const [parsed] = buildVault([characterFile]).characters
    expect(parsed.frontmatter.type).toBe('character')
    expect(parsed.frontmatter.name).toBe('Test Hero')
    expect(parsed.body).toBe('Backstory text.')
  })

  it('keeps unrecognized types as plain notes', () => {
    const vault = buildVault([notesFile])
    expect(vault.characters).toHaveLength(0)
    expect(vault.notes.map((n) => n.name)).toEqual(['Session 1'])
  })

  it('throws for a missing name field', () => {
    expect(() => buildVault([{ path: 'bad.md', content: '---\ntype: item\n---\n' }])).toThrow(FrontmatterValidationError)
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

  it('points spell slot write-back at a linked spell sheet when the character file has no inline spellcasting', () => {
    const linkedSpells = {
      path: 'Characters/Spell Sheet.md',
      content: '---\nCharakter: "[[Test]]"\nspellcasting:\n  ability: int\n  slots:\n    "1": { max: 2, used: 0 }\n---\n',
    }
    const vault = buildVault([characterFile, linkedSpells])
    expect(vault.characters[0].frontmatter._write?.spell_slots).toEqual({
      1: { path: 'Characters/Spell Sheet.md', keyPath: ['spellcasting', 'slots', '1', 'used'], createIfMissing: true },
    })
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

  it('takes core attributes from the class note, accepting wikilinks, keys, abbreviations and full names', () => {
    const classNote = { path: 'Klassen/Fighter.md', content: '---\nKernattribute: ["[[Stärke]]", ko, Geschick, Unsinn]\n---\n' }
    const vault = buildVault([characterFile, classNote])
    expect(vault.characters[0].frontmatter.nimble_primary_attributes).toEqual(['st', 'ko', 'ge'])
  })

  it('still accepts the older Primärattribute field', () => {
    const classNote = { path: 'Klassen/Fighter.md', content: '---\nPrimärattribute: [VS, En]\n---\n' }
    const vault = buildVault([characterFile, classNote])
    expect(vault.characters[0].frontmatter.nimble_primary_attributes).toEqual(['vs', 'en'])
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
    const classNote = { path: 'Klassen/Prüfling/Prüfling.md', content: '---\nBasisTP: 4\nBasisRP: 2\n---\n' }
    const subclassNote = { path: 'Klassen/Wächter.md', content: '---\nBasisTP: 1\n---\n' }
    // Shaped like the DM's real class notes (`Klassen/<Klasse>/<Klasse>.md`).
    const arkanistNote = {
      path: 'Klassen/Arkanist/Arkanist.md',
      content: `---
tags:
  - Regeln/Endeavour/Charakter/Klasse
BasisTP: 2
BasisRP: 0
Kernattribute:
  - "[[Verstand]]"
  - "[[Entschlossenheit]]"
Übung:
  Waffen:
    - "[[Einfache Waffen]]"
  Rüstungen:
    - keine
Rettungswürfe:
  Vorteil:
    - "[[Verstandsrettungswürfe|VS-Rettungswürfe]]"
    - "[[Entschlossenheitsrettungswürfe|EN-Rettungswürfe]]"
  Nachteil:
    - "[[Stärkerettungswürfe|ST-Rettungswürfe]]"
    - "[[Konstitutionsrettungswürfe|KO-Rettungswürfe]]"
---
`,
    }
    const taktikerNote = {
      path: 'Klassen/Taktiker/Taktiker.md',
      content: `---
BasisTP: 2
BasisRP: 2
Übung:
  Waffen:
    - "[[Einfache Waffen]]"
    - "[[Kriegswaffen]]"
  Rüstungen:
    - "[[Schwere Rüstung]]"
Rettungswürfe:
  Vorteil:
    - "[[Stärkerettungswürfe|ST-Rettungswürfe]]"
  Nachteil:
    - "[[Verstandsrettungswürfe|VS-Rettungswürfe]]"
---
`,
    }
    const asClass = (classYaml: string) => {
      const file = nimbleCharacter()
      return { ...file, content: file.content.replace('  - name: Prüfling\n    level: 3\n    subclass: Wächter\n', classYaml) }
    }
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

    it("takes the armor class from the worn armor's RK, 0 without armor, ignoring the sheet's value", () => {
      // The fixture's own `armor_class: 10` must not survive either way.
      const worn = buildVault([nimbleCharacter('armor: "[[Kettenhemd]]"\n'), chainShirt])
      expect(worn.characters[0].frontmatter.armor_class).toBe(3)
      const unarmored = buildVault([nimbleCharacter(), chainShirt])
      expect(unarmored.characters[0].frontmatter.armor_class).toBe(0)
    })

    it('loads a sheet without abilities or proficiency_bonus', () => {
      const file = nimbleCharacter()
      const content = file.content.replace(/abilities: .*\n/, '').replace(/proficiency_bonus: .*\n/, '')
      const vault = buildVault([{ ...file, content }])
      expect(vault.characters[0].frontmatter.abilities).toEqual({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 })
      expect(vault.characters[0].frontmatter.proficiency_bonus).toBeUndefined()
    })

    it('resolves linked Merkmale into actions, reactions and passive features', () => {
      const note = (name: string, einsatz: string, extra = '') => ({
        path: `Merkmale/${name}.md`,
        content: `---\ntags: [Merkmal]\n${einsatz}${extra}---\n# \`=this.file.name\`\nText zu ${name}.\n`,
      })
      const vault = buildVault([
        nimbleCharacter('Merkmale:\n  - "[[Wuchtschlag]]"\n  - "[[Parieren]]"\n  - "[[Dunkelsicht]]"\n  - "[[Unbekannt]]"\n'),
        note('Wuchtschlag', 'Einsatz: "[[Aktion]]"\n', 'Beschreibung: Ein harter Schlag.\n'),
        note('Parieren', 'Einsatz: "[[Reaktion]]"\n'),
        note('Dunkelsicht', 'Einsatz: Passiv\n'),
      ])
      expect(vault.characters[0].frontmatter.features).toEqual([
        { name: 'Wuchtschlag', description: 'Ein harter Schlag.', usage: 'action' },
        { name: 'Parieren', description: 'Text zu Parieren.', usage: 'reaction' },
        { name: 'Dunkelsicht', description: 'Text zu Dunkelsicht.', usage: 'passive' },
        { name: 'Unbekannt', usage: 'passive' },
      ])
    })

    it('drops hit dice and their write target', () => {
      const vault = buildVault([nimbleCharacter()])
      expect(vault.characters[0].frontmatter.hit_dice).toBeUndefined()
      expect(vault.characters[0].frontmatter._write?.hit_dice_remaining).toBeUndefined()
    })

    it('derives max TP/RP from BasisTP/BasisRP + subclass + attribute bonus, with level 1 counted twice', () => {
      const vault = buildVault([nimbleCharacter(), classNote, subclassNote])
      const { hp, resilience } = vault.characters[0].frontmatter
      // TP: (3 + 1) × (4 class + 1 subclass + 2 KO); RP: (3 + 1) × (2 class + 0 subclass + floor(3 EN / 2))
      expect(hp).toEqual({ current: 5, max: 28 })
      expect(resilience).toEqual({ current: 4, max: 12 })
    })

    it('counts a level-1 character as (BasisTP + KO) × 2', () => {
      const vault = buildVault([asClass('  - name: Arkanist\n    level: 1\n'), arkanistNote])
      const { hp, resilience } = vault.characters[0].frontmatter
      // TP: (2 + 2 KO) × 2; RP: (0 + floor(3 EN / 2)) × 2
      expect(hp.max).toBe(8)
      expect(resilience?.max).toBe(2)
    })

    it('doubles level 1 only for the first listed class of a multiclass character', () => {
      const vault = buildVault([asClass('  - name: Arkanist\n    level: 2\n  - name: Taktiker\n    level: 1\n'), arkanistNote, taktikerNote])
      // TP: 3 × (2 + 2) + 1 × (2 + 2); RP: 3 × (0 + 1) + 1 × (2 + 1)
      expect(vault.characters[0].frontmatter.hp.max).toBe(16)
      expect(vault.characters[0].frontmatter.resilience?.max).toBe(6)
    })

    describe('weapon attacks', () => {
      const bow = {
        path: 'Gegenstände/Waffen/Waffen/Kurzbogen.md',
        content:
          '---\ntags: [Gegenstand/Waffe/Fernkampfwaffe]\nSchadenFern: 1d6\nSchadensartFern: "[[Stichschaden]]"\nRange1: 3(2)\nRange2: 24(16)\nRange3: 96(64)\nEigenschaftenFern: ["[[Zweihändig]]"]\n---\n',
      }
      const axe = {
        path: 'Gegenstände/Waffen/Waffen/Axt.md',
        content: '---\ntags: [Gegenstand/Waffe/Nahkampfwaffe]\nReichweite: 1,5(1)\nSchaden: 1d6\nSchadensart: "[[Hiebschaden]]"\n---\n',
      }
      const rapier = {
        path: 'Gegenstände/Waffen/Waffen/Rapier.md',
        content: '---\ntags: [Gegenstand/Waffe/Nahkampfwaffe]\nReichweite: 1,5(1)\nSchaden: 1d8\nEigenschaften: ["[[Finesse]]"]\n---\n',
      }
      /** The Nimble test character with the given `attacks:` list and ST/GE values. */
      const attacksOf = (list: string, st = 0, ge = 0) => {
        const sheet = nimbleCharacter(`attacks: ${list}\n`)
        const content = sheet.content.replace('st: 0, bw: 4, ko: 2, ge: 0', `st: ${st}, bw: 4, ko: 2, ge: ${ge}`)
        return buildVault([{ ...sheet, content }, bow, axe, rapier]).characters[0].frontmatter.attacks
      }

      it('reads a linked weapon note, ST for melee and GE for ranged weapons', () => {
        expect(attacksOf('["[[Axt]]", "[[Kurzbogen]]"]', 2, 1)).toEqual([
          { name: 'Axt', kind: 'melee', attribute: 'st', attack_bonus: 2, damage_dice: '1d6', damage_bonus: 2, damage_type: 'Hiebschaden', range: '1,5 m', properties: [] },
          { name: 'Kurzbogen', kind: 'ranged', attribute: 'ge', attack_bonus: 1, damage_dice: '1d6', damage_bonus: 1, damage_type: 'Stichschaden', range: '3/24/96 m', properties: ['Zweihändig'] },
        ])
      })

      it('uses the higher of ST and GE for a Finesse weapon', () => {
        expect(attacksOf('["[[Rapier]]"]', 1, 3)?.[0]).toMatchObject({ attribute: 'ge', attack_bonus: 3, damage_bonus: 3 })
        expect(attacksOf('["[[Rapier]]"]', 2, 1)?.[0]).toMatchObject({ attribute: 'st', attack_bonus: 2, damage_bonus: 2 })
      })

      it('keeps written-out attacks and drops links to missing notes', () => {
        const attacks = attacksOf('[{ name: Klauen, kind: melee, attack_bonus: 1, damage_dice: 1d4, damage_bonus: 1, range: 1,5 m }, "[[Gibtsnicht]]"]')
        expect(attacks?.map((a) => a.name)).toEqual(['Klauen'])
      })
    })

    it('reads core attributes, save advantage/disadvantage and training from the class note', () => {
      const vault = buildVault([asClass('  - name: Arkanist\n    level: 1\n'), arkanistNote])
      const c = vault.characters[0].frontmatter
      expect(c.nimble_primary_attributes).toEqual(['vs', 'en'])
      expect(c.nimble_save_modes).toEqual({ vs: 'advantage', en: 'advantage', st: 'disadvantage', ko: 'disadvantage' })
      expect(c.nimble_class_proficiencies).toEqual({ weapons: ['Einfache Waffen'], armor: [] })
    })

    it('cancels a save that one class grants advantage and another disadvantage, and merges training', () => {
      const vault = buildVault([asClass('  - name: Arkanist\n    level: 2\n  - name: Taktiker\n    level: 1\n'), arkanistNote, taktikerNote])
      const c = vault.characters[0].frontmatter
      expect(c.nimble_save_modes).toEqual({ en: 'advantage', ko: 'disadvantage' })
      expect(c.nimble_class_proficiencies).toEqual({ weapons: ['Einfache Waffen', 'Kriegswaffen'], armor: ['Schwere Rüstung'] })
    })

    it("keeps the sheet's own max when the class note declares no per-level values", () => {
      const vault = buildVault([nimbleCharacter()])
      expect(vault.characters[0].frontmatter.hp.max).toBe(99)
      expect(vault.characters[0].frontmatter.resilience?.max).toBe(99)
    })
  })
})
