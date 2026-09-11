import { describe, expect, it } from 'vitest'
import { buildVault } from '../parseFrontmatter'

const characterFile = {
  path: 'Kampagne/GORN/Testar/Testar.md',
  content: `---
Stufe: 6
Bewegung: 8
Verteidigung:
  Natürliche_Rüstung: 10
  Zusätzliche_Rüstung: 0
Attribute:
  Stärke: 18
  Geschicklichkeit: 14
  Konstitution: 15
  Intelligenz: 10
  Weisheit: 12
  Charisma: 8
Rettungswürfe:
  Stärke: 1
  Geschicklichkeit: 1
  Konstitution: 1
  Intelligenz: 0
  Weisheit: 0
  Charisma: 0
Fertigkeiten:
  Akrobatik: 0
  Arkane_Kunde: 0
  Athletik: 1
  Auftreten: 0
  Einschüchtern: 1
  Fingerfertigkeit: 0
  Geschichte: 0
  Heilkunde: 0
  Heimlichkeit: 0
  Mit_Tieren_umgehen: 0
  Motiv_erkennen: 0
  Nachforschungen: 0
  Naturkunde: 1
  Religion: 0
  Täuschen: 0
  Überlebenskunst: 1
  Überzeugen: 0
  Wahrnehmung: 1
Gesundheit:
  MaxTP: 71
  TP: 21
  TW: 6
  TempTP: 0
Übung:
  Sprachen:
    - "[[Gemeinsprache]]"
    - "[[Zwergisch]]"
  Werkzeuge:
    - "[[Spiel]]"
Merkmale:
  - "[[Dunkelsicht]]"
  - "[[Kampfrausch]]"
Talente:
  - "[[Wilder Angreifer]]"
Hintergrund:
  Name: Testar
  Volk: "[[Zwerge|Zwerg]]"
  Klasse: "[[Barbar]]"
  Subklasse: "[[Pfad des Slayers]]"
  Gesinnung: "[[Neutral Gut]]"
  Herkunft: "[[Soldat]]"
---
# Testar
Ein Testcharakter.
`,
}

const classFile = {
  path: 'Charaktere/Klassen/Barbar/Barbar.md',
  content: `---\ntags: [Klasse]\nTrefferwürfel: W12\n---\nBarbarenregeln.`,
}

const featureFile = {
  path: 'Merkmale/Kampfrausch.md',
  content: `---\ntags: [Merkmal]\n---\n*Du kannst dich mit einer Urmacht namens Kampfrausch versehen.*\n\nWeitere Details.`,
}

const inventoryFile = {
  path: 'Kampagne/GORN/Testar/Inventar Testar.md',
  content: `---
Charakter: "[[Testar]]"
Geld:
  PM: 10
  GM: 100
  EM: 3
  SM: 5
  KM: 9
---
## Am Körper
| Gegenstand | Anzahl | Gewicht | Gesamt |
| ---------- |:------:|:-------:|:------:|
| [[Streitaxt]] | 2 | 5 | 10 |
| GESAMT | | | 10 |

## Rucksack
| Gegenstand | Anzahl | Gewicht | Gesamt |
| ---------- |:------:|:-------:|:------:|
| [[Fackel]] | 3 | 1 | 3 |
| GESAMT | | | 3 |
`,
}

const casterCharacterFile = {
  path: 'Kampagne/GORN/Lucia/Lucia.md',
  content: `---
Stufe: 5
Bewegung: 6
Verteidigung:
  Natürliche_Rüstung: 10
Attribute:
  Stärke: 8
  Geschicklichkeit: 14
  Konstitution: 13
  Intelligenz: 12
  Weisheit: 10
  Charisma: 18
Rettungswürfe:
  Stärke: 0
  Geschicklichkeit: 0
  Konstitution: 0
  Intelligenz: 0
  Weisheit: 1
  Charisma: 1
Fertigkeiten:
  Akrobatik: 0
  Arkane_Kunde: 1
  Athletik: 0
  Auftreten: 0
  Einschüchtern: 0
  Fingerfertigkeit: 0
  Geschichte: 0
  Heilkunde: 0
  Heimlichkeit: 0
  Mit_Tieren_umgehen: 0
  Motiv_erkennen: 0
  Nachforschungen: 0
  Naturkunde: 0
  Religion: 0
  Täuschen: 1
  Überlebenskunst: 0
  Überzeugen: 1
  Wahrnehmung: 0
Gesundheit:
  MaxTP: 33
  TP: 33
  TW: 5
  TempTP: 0
Hintergrund:
  Name: Lucia
  Volk: "[[Menschen|Mensch]]"
  Klasse: "[[Hexenmeister]]"
  Gesinnung: "[[Chaotisch Neutral]]"
  Herkunft: "[[Weiser]]"
---
# Lucia
Eine Testhexenmeisterin.
`,
}

const casterClassFile = {
  path: 'Charaktere/Klassen/Hexenmeister/Hexenmeister.md',
  content: `---
tags: [Klasse]
Trefferwürfel: W8
Zauberattribut: "[[Charisma]]"
Zauberplätze:
  Stufe5:
    Grad0: 2
    Grad1: 0
    Grad2: 2
    Grad3: 0
    Grad4: 0
    Grad5: 0
    Grad6: 0
    Grad7: 0
    Grad8: 0
    Grad9: 0
---
Hexenmeisterregeln.`,
}

const spellSheetFile = {
  path: 'Kampagne/GORN/Lucia/Spell Sheet Lucia.md',
  content: `---
Charakter: "[[Lucia]]"
Zauberplätze:
  Grad_1: 0
  Grad_2: 1
Zauber:
  - "[[Unsichtbarkeit]]"
  - "[[Schauriger Strahl]]"
Pakt_des_Buches:
  - "[[Magierhand]]"
---
Zauber Lucia.
`,
}

describe('legacy character sheet adapter', () => {
  const vault = buildVault([characterFile, classFile, featureFile, inventoryFile])

  it('detects and normalizes a character with no type: marker', () => {
    expect(vault.characters).toHaveLength(1)
    const character = vault.characters[0].frontmatter
    expect(character.name).toBe('Testar')
    expect(character.class).toEqual([{ name: 'Barbar', level: 6, subclass: 'Pfad des Slayers' }])
    expect(character.species).toBe('Zwerg')
    expect(character.abilities).toEqual({ str: 18, dex: 14, con: 15, int: 10, wis: 12, cha: 8 })
  })

  it('computes proficiency bonus from level and maps saving throw / skill proficiencies', () => {
    const character = vault.characters[0].frontmatter
    expect(character.proficiency_bonus).toBe(3) // ceil(6/4)+1
    expect(character.saving_throw_proficiencies.sort()).toEqual(['con', 'dex', 'str'])
    expect(character.skill_proficiencies).toEqual(
      expect.arrayContaining(['athletics', 'intimidation', 'nature', 'survival', 'perception']),
    )
  })

  it('resolves hit die via the linked class file', () => {
    expect(vault.characters[0].frontmatter.hit_dice).toEqual({ die: 'd12', total: 6, used: 0 })
  })

  it('resolves feature descriptions via the linked feature file', () => {
    const kampfrausch = vault.characters[0].frontmatter.features?.find((f) => f.name === 'Kampfrausch')
    expect(kampfrausch?.source).toBe('Merkmal')
    expect(kampfrausch?.description).toContain('Urmacht')
  })

  it('parses the linked inventory file into inline items and currency', () => {
    const character = vault.characters[0].frontmatter
    expect(character.inventory?.equipped).toEqual([{ name: 'Streitaxt', quantity: 2, weight_lb: 5 }])
    expect(character.inventory?.carried).toEqual([{ name: 'Fackel', quantity: 3, weight_lb: 1 }])
    expect(character.currency).toEqual({ pp: 10, gp: 100, ep: 3, sp: 5, cp: 9 })
  })

  it('has no spellcasting for a non-caster class', () => {
    expect(vault.characters[0].frontmatter.spellcasting).toBeUndefined()
    expect(vault.characters[0].frontmatter.spells_known).toBeUndefined()
  })
})

describe('legacy character sheet adapter - spellcasting', () => {
  const vault = buildVault([casterCharacterFile, casterClassFile, spellSheetFile])
  const character = vault.characters[0].frontmatter

  it('derives spellcasting ability from the linked class file', () => {
    expect(character.spellcasting?.ability).toBe('cha')
  })

  it('derives max/used slots per grade from the class table and the spell sheet current count', () => {
    expect(character.spellcasting?.slots).toEqual({ 2: { max: 2, used: 1 } })
  })

  it('collects known spells (including pact-of-the-tome extras) as resolvable wikilinks', () => {
    expect(character.spells_known).toEqual(['[[Unsichtbarkeit]]', '[[Schauriger Strahl]]', '[[Magierhand]]'])
  })
})

const creatureFile = {
  path: 'Bestiarium/Kreaturen/Tiere/Testkreatur.md',
  content: `---
Typ: "[[Tiere|Tier]]"
Herausforderungsgrad: 0.125
Stufe: 1
Attribute:
  Stärke: 4
  Geschicklichkeit: 16
  Konstitution: 11
  Intelligenz: 2
  Weisheit: 8
  Charisma: 6
Rettungswürfe:
  Stärke: 0
  Geschicklichkeit: 0
  Konstitution: 0
  Intelligenz: 0
  Weisheit: 0
  Charisma: 0
Fertigkeiten:
  Akrobatik: 0
  Arkane_Kunde: 0
  Athletik: 0
  Auftreten: 0
  Einschüchtern: 0
  Fingerfertigkeit: 0
  Geschichte: 0
  Heilkunde: 0
  Heimlichkeit: 0
  Mit_Tieren_umgehen: 0
  Motiv_erkennen: 0
  Nachforschungen: 0
  Naturkunde: 0
  Religion: 0
  Täuschen: 0
  Überlebenskunst: 0
  Überzeugen: 0
  Wahrnehmung: 0
---
Ein Statblock ohne Hintergrund-Block.
`,
}

describe('legacy character sheet adapter - creature stat blocks', () => {
  it('does not mistake a Bestiarium creature stat block (no Hintergrund block) for a player character', () => {
    const vault = buildVault([creatureFile])
    expect(vault.characters).toHaveLength(0)
  })
})

const inlineSpellCharacterFile = {
  path: "Kampagne/GORN/Nox/Nox.md",
  content: `---
Stufe: 3
Bewegung: 6
Verteidigung:
  Natürliche_Rüstung: 10
Attribute:
  Stärke: 8
  Geschicklichkeit: 14
  Konstitution: 12
  Intelligenz: 10
  Weisheit: 10
  Charisma: 16
Rettungswürfe:
  Stärke: 0
  Geschicklichkeit: 0
  Konstitution: 0
  Intelligenz: 0
  Weisheit: 0
  Charisma: 0
Fertigkeiten:
  Akrobatik: 0
  Arkane_Kunde: 0
  Athletik: 0
  Auftreten: 0
  Einschüchtern: 0
  Fingerfertigkeit: 0
  Geschichte: 0
  Heilkunde: 0
  Heimlichkeit: 0
  Mit_Tieren_umgehen: 0
  Motiv_erkennen: 0
  Nachforschungen: 0
  Naturkunde: 0
  Religion: 0
  Täuschen: 0
  Überlebenskunst: 0
  Überzeugen: 0
  Wahrnehmung: 0
Gesundheit:
  MaxTP: 20
  TP: 20
  TW: 3
  TempTP: 0
Hintergrund:
  Name: Nox
  Volk: "[[Menschen|Mensch]]"
  Klasse: "[[Zauberer]]"
  Gesinnung: "[[Neutral Gut]]"
  Herkunft: "[[Weiser]]"
Zauber:
  - "[[Feuerpfeil]]"
  - "[[Schild]]"
InputData:
  Zauberplätze:
    Grad_1: 1
    Grad_2: 0
tags:
  - Charakter/GORN
---
# Nox
`,
}

const zauberklasseFile = {
  path: 'Charaktere/Klassen/Zauberer/Zauberer.md',
  content: `---
tags: [Klasse]
Trefferwürfel: W6
Zauberattribut: "[[Charisma]]"
Zauberplätze:
  Stufe3:
    Grad0: 3
    Grad1: 4
    Grad2: 2
    Grad3: 0
    Grad4: 0
    Grad5: 0
    Grad6: 0
    Grad7: 0
    Grad8: 0
    Grad9: 0
---
Zaubererregeln.`,
}

describe('legacy character sheet adapter - spells stored inline on the character (no separate sheet)', () => {
  const vault = buildVault([inlineSpellCharacterFile, zauberklasseFile])
  const character = vault.characters[0].frontmatter

  it('reads known spells directly off the character file', () => {
    expect(character.spells_known).toEqual(['[[Feuerpfeil]]', '[[Schild]]'])
  })

  it('reads current slot usage from InputData.Zauberplätze on the character file', () => {
    expect(character.spellcasting?.ability).toBe('cha')
    expect(character.spellcasting?.slots).toEqual({ 1: { max: 4, used: 3 }, 2: { max: 2, used: 2 } })
  })
})

const conditionsCharacterFile = {
  path: "Kampagne/GORN/Zola/Zola.md",
  content: `---
Stufe: 4
Bewegung: 6
Verteidigung:
  Natürliche_Rüstung: 10
Attribute:
  Stärke: 16
  Geschicklichkeit: 14
  Konstitution: 14
  Intelligenz: 10
  Weisheit: 10
  Charisma: 10
Rettungswürfe:
  Stärke: 0
  Geschicklichkeit: 0
  Konstitution: 0
  Intelligenz: 0
  Weisheit: 0
  Charisma: 0
Fertigkeiten:
  Akrobatik: 0
  Arkane_Kunde: 0
  Athletik: 0
  Auftreten: 0
  Einschüchtern: 0
  Fingerfertigkeit: 0
  Geschichte: 0
  Heilkunde: 0
  Heimlichkeit: 0
  Mit_Tieren_umgehen: 0
  Motiv_erkennen: 0
  Nachforschungen: 0
  Naturkunde: 0
  Religion: 0
  Täuschen: 0
  Überlebenskunst: 0
  Überzeugen: 0
  Wahrnehmung: 0
Gesundheit:
  MaxTP: 40
  TP: 40
  TW: 4
  TempTP: 0
Hintergrund:
  Name: Zola
  Volk: "[[Menschen|Mensch]]"
  Klasse: "[[Barbar]]"
  Gesinnung: "[[Chaotisch Neutral]]"
  Herkunft: "[[Soldat]]"
Waffen:
  - "[[Streitaxt]]"
  - "[[Dolch]]"
InputData:
  GlücksPunkt1: true
  GlücksPunkt2: true
  GlücksPunkt3: false
  GlücksPunkt4: false
  GlücksPunkt5: false
  ErschöpfungsPunkte: 2
sonstigeZustaende: "Vergiftet bis zum nächsten Kurzen Rast"
---
# Zola
`,
}

const streitaxtFile = {
  path: 'Gegenstände/Waffen/Waffen/Streitaxt.md',
  content: `---
tags:
  - Gegenstand/Waffe/Klasse/Nahkampfwaffe
Reichweite: 1,5(1)
Schaden: 1d8
Schadensart: "[[Hiebschaden]]"
Eigenschaften:
  - "[[Vielseitig]] (\`dice: 1d10|none|noform\`)"
SchadenFern:
SchadensartFern:
Range1:
Range2:
Range3:
EigenschaftenFern:
---
Waffennotiz.`,
}

const dolchFile = {
  path: 'Gegenstände/Waffen/Waffen/Dolch.md',
  content: `---
tags:
  - Gegenstand/Waffe/Klasse/Nahkampfwaffe
  - Gegenstand/Waffe/Klasse/Fernkampfwaffe/Wurfwaffe
Reichweite: 1,5(1)
Schaden: 1d4
Schadensart: "[[Stichschaden]]"
Eigenschaften:
  - "[[Finesse]]"
  - "[[Leicht]]"
SchadenFern: 1d4
SchadensartFern: "[[Stichschaden]]"
Range1: 6
Range2:
Range3: 18
EigenschaftenFern:
  - "[[Finesse]]"
---
Waffennotiz.`,
}

describe('legacy character sheet adapter - conditions (Zustände)', () => {
  const vault = buildVault([conditionsCharacterFile])
  const character = vault.characters[0].frontmatter

  it('counts held luck points and reads the exhaustion counter', () => {
    expect(character.conditions?.luck_points).toEqual({ max: 5, current: 2 })
    expect(character.conditions?.exhaustion).toBe(2)
    expect(character.conditions?.exhaustion_max).toBe(9)
  })

  it('reads the free-text "other conditions" field', () => {
    expect(character.conditions?.notes).toBe('Vergiftet bis zum nächsten Kurzen Rast')
  })
})

describe('legacy character sheet adapter - weapon attacks', () => {
  const vault = buildVault([conditionsCharacterFile, streitaxtFile, dolchFile])
  const character = vault.characters[0].frontmatter

  it('computes a non-finesse melee weapon off Strength', () => {
    const axe = character.attacks?.find((a) => a.name === 'Streitaxt')
    expect(axe).toEqual({
      name: 'Streitaxt',
      kind: 'melee',
      attack_bonus: 5, // STR mod (+3) + proficiency (ceil(4/4)+1 = 2)
      damage_dice: '1d8',
      damage_bonus: 3,
      damage_type: 'Hiebschaden',
      range: '1,5(1)',
      properties: ['Vielseitig'],
    })
  })

  it('picks Dexterity over Strength for a finesse weapon', () => {
    const dagger = character.attacks?.find((a) => a.name === 'Dolch')
    expect(dagger?.attack_bonus).toBe(4) // DEX mod (+2) + proficiency (2)
    expect(dagger?.damage_bonus).toBe(2)
    expect(dagger?.damage_dice).toBe('1d4')
    expect(dagger?.kind).toBe('melee')
  })
})

describe('legacy character sheet adapter - resource pools', () => {
  const vault = buildVault([casterCharacterFile, casterClassFile])

  it('has no resource pools when the class file defines none', () => {
    expect(vault.characters[0].frontmatter.resource_pools).toBeUndefined()
  })
})

const sorcererCharacterFile = {
  ...casterCharacterFile,
  path: 'Kampagne/GORN/Ember/Ember.md',
  content: casterCharacterFile.content
    .replace('Klasse: "[[Hexenmeister]]"', 'Klasse: "[[Zauberer]]"')
    .replace('Name: Lucia', 'Name: Ember')
    .replace('Herkunft: "[[Weiser]]"\n---', 'Herkunft: "[[Weiser]]"\nInputData:\n  Zaubereipunkte: 3\n---'),
}

const sorcererClassFile = {
  path: 'Charaktere/Klassen/Zauberer/Zauberer.md',
  content: `---
tags: [Klasse]
Trefferwürfel: W6
Zauberattribut: "[[Charisma]]"
Zaubereipunkte:
  Stufe5: 5
Zauberplätze:
  Stufe5:
    Grad0: 4
    Grad1: 4
    Grad2: 3
    Grad3: 0
    Grad4: 0
    Grad5: 0
    Grad6: 0
    Grad7: 0
    Grad8: 0
    Grad9: 0
---
Zaubererregeln.`,
}

describe('legacy character sheet adapter - class resource pools (e.g. sorcery points)', () => {
  const vault = buildVault([sorcererCharacterFile, sorcererClassFile])
  const character = vault.characters[0].frontmatter

  it('reads current/max off InputData and the class file\'s per-level table', () => {
    expect(character.resource_pools).toEqual([{ name: 'Zaubereipunkte', current: 3, max: 5 }])
  })
})

describe('legacy character sheet adapter - portrait', () => {
  it('resolves a Bild attachment reference against the loaded image assets', () => {
    const imageAssets = new Map([['portrait.jpg', 'blob:mock-url']])
    const vault = buildVault([{ ...casterCharacterFile, content: casterCharacterFile.content.replace('Herkunft: "[[Weiser]]"', 'Herkunft: "[[Weiser]]"\n  Bild: "[[Portrait.jpg]]"') }], imageAssets)
    expect(vault.characters[0].frontmatter.portrait_url).toBe('blob:mock-url')
  })

  it('leaves portrait_url undefined when there is no Bild field or no matching asset', () => {
    const vault = buildVault([casterCharacterFile], new Map())
    expect(vault.characters[0].frontmatter.portrait_url).toBeUndefined()
  })
})
