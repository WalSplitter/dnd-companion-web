import { describe, expect, it } from 'vitest'
import { parseRawFile } from '../rawFile'
import type { CharacterFrontmatter } from '../types'
import { evaluateCell, resolveClassProgressions, SUBCLASS_FAMILY } from './classProgression'

const raw = (path: string, content: string) => parseRawFile({ path, content })

// The old D&D vault's shape: Dataview value cells, a subclass list link, `Merkmal: …` rows, `\|` aliases.
const fighter = raw(
  'Klassen/Kämpfer/Kämpfer.md',
  `---
Name_Subklassen: "[[Kampfarchetypen|Kampfarchetyp]]"
Tatendrang:
  Stufe1: 0
  Stufe2: 1
---
# Kämpfer

## Klassentabelle

| Stufe | Tatendrang | Merkmale |
|:-----:|:---:| ------------------------------------- |
|   1   | \`=this.Tatendrang.Stufe1\` | [[Kampfstil]], [[Durchschnaufen]] |
|   2   | \`=this.Tatendrang.Stufe2 + "x"\` | [[Tatendrang]] (1) |
|   3   | – | [[Kampfarchetypen\\|Kampfarchetyp]] |
|   4   | – | [[Talente\\|Talent]] |
|   7   | – | Merkmal: Kampfarchetyp |
|   8   | – | [[Talente\\|Talent]], [[Tatendrang]] (2) |
|  10   | – | Merkmal: Kampfarchetyp |
`,
)
const battleMaster = raw(
  'Klassen/Kämpfer/Kampfmeister.md',
  `# Kampfmeister

## Merkmale

| Stufe | Merkmal | Überlegenheitswürfel |
|:-----:| ------- |:---:|
| 3 | [[Kampfüberlegenheit]], [[Schüler des Krieges]] | 4W8 |
| 7 | [[Kenne deinen Feind]] | 5W8 |
`,
)
const durchschnaufen = raw('Durchschnaufen.md', '---\nEinsatz: "[[Bonusaktion]]"\nBeschreibung: Heile 1W10 + Stufe.\n---\n')
const talente = raw('Talente.md', '# Talente\n\nWähle ein Talent.\n\n## Optionen\n- **Wachsam**: +5 Initiative\n- [[Zäh]] — mehr TP\n')

const character = (cls: CharacterFrontmatter['class']): CharacterFrontmatter => ({ class: cls }) as CharacterFrontmatter

describe('resolveClassProgressions', () => {
  const files = [fighter, battleMaster, durchschnaufen, talente]

  it('reads the class table with ranks, values and feature notes', () => {
    const [p] = resolveClassProgressions(character([{ name: 'Kämpfer', level: 4 }]), files)
    expect(p.fromTable).toBe(true)
    expect(p.subclassLabel).toBe('Kampfarchetyp')
    const byName = (name: string) => p.nodes.find((n) => n.name === name)!
    expect(byName('Tatendrang (2)')).toMatchObject({ level: 8, family: 'tatendrang', rank: 2, familyName: 'Tatendrang' })
    expect(byName('Durchschnaufen')).toMatchObject({ usage: 'action', description: 'Heile 1W10 + Stufe.', note: 'Durchschnaufen' })
    expect(p.nodes.filter((n) => n.family === 'talente').map((n) => n.level)).toEqual([4, 8])
    expect(byName('Talent').options).toEqual([{ name: 'Wachsam', text: '+5 Initiative' }, { name: 'Zäh', text: 'mehr TP' }])
    expect(p.values.get(1)).toBeUndefined() // `0` says nothing
    expect(p.values.get(2)).toEqual([{ label: 'Tatendrang', value: '1x' }])
  })

  it('without a chosen subclass keeps its choice and placeholder rows', () => {
    const [p] = resolveClassProgressions(character([{ name: 'Kämpfer', level: 4 }]), files)
    expect(p.nodes.filter((n) => n.family === SUBCLASS_FAMILY).map((n) => [n.level, n.kind])).toEqual([
      [3, 'subclass-choice'],
      [7, 'subclass-placeholder'],
      [10, 'subclass-placeholder'],
    ])
  })

  it("puts the chosen subclass's features in place of its rows", () => {
    const [p] = resolveClassProgressions(character([{ name: 'Kämpfer', level: 4, subclass: 'Kampfmeister' }]), files)
    expect(p.subclass).toEqual({ name: 'Kampfmeister', found: true })
    expect(p.nodes.filter((n) => n.family === SUBCLASS_FAMILY).map((n) => `${n.level} ${n.name}`)).toEqual([
      '3 Kampfarchetyp',
      '3 Kampfüberlegenheit',
      '3 Schüler des Krieges',
      '7 Kenne deinen Feind',
      // Level 10 has no row in the subclass table, so it stays a placeholder.
      '10 Merkmal: Kampfarchetyp',
    ])
    expect(p.values.get(7)).toEqual([{ label: 'Überlegenheitswürfel', value: '5W8' }])
  })

  it('falls back to the features whose source names the class and a level', () => {
    const empty = raw('Waldläufer.md', '# Waldläufer\n\n## Klassentabelle\n')
    const c = { ...character([{ name: 'Waldläufer', level: 2 }]), features: [{ name: 'Beute markieren', source: 'Waldläufer 1' }, { name: 'Maske', source: 'Waldelf' }] }
    const [p] = resolveClassProgressions(c as CharacterFrontmatter, [empty])
    expect(p).toMatchObject({ fromTable: false, noteFound: true, maxLevel: 20 })
    expect(p.nodes.map((n) => [n.level, n.name])).toEqual([[1, 'Beute markieren']])
  })

  it('reports a class without a note', () => {
    const [p] = resolveClassProgressions(character([{ name: 'Barde', level: 1 }]), [])
    expect(p).toMatchObject({ noteFound: false, fromTable: false, nodes: [] })
  })
})

describe('evaluateCell', () => {
  const data = { A: { Stufe3: 2 }, B: 'x' }
  it('evaluates simple Dataview paths and string joins', () => {
    expect(evaluateCell('`=this.A.Stufe3 + "W6"`', data)).toBe('2W6')
    expect(evaluateCell('+`=this.A.Stufe3`', data)).toBe('+2')
    expect(evaluateCell('`=this.A.Stufe3 + 1`', data)).toBe('3')
    expect(evaluateCell('[[Zaubertricks|ZT]] 4', data)).toBe('ZT 4')
  })
  it('gives up on anything it cannot resolve', () => {
    expect(evaluateCell('`=this.Missing`', data)).toBeUndefined()
    expect(evaluateCell('`=dv.page("x")`', data)).toBeUndefined()
    expect(evaluateCell('—', data)).toBeUndefined()
  })
})
