import { describe, expect, it } from 'vitest'
import { extractItemTable } from './markdownTable'

describe('extractItemTable', () => {
  it('parses a plain table with literal numbers', () => {
    const body = `## Am Körper
| Gegenstand | Anzahl | Gewicht | Gesamt |
| ---------- |:------:|:-------:|:------:|
| [[Streitaxt]] | 2 | 5 | 10 |
| GESAMT | | | 10 |
`
    expect(extractItemTable(body, 'Am Körper')).toEqual([{ name: 'Streitaxt', quantity: 2, weight_lb: 5 }])
  })

  it('finds a heading nested inside an Obsidian callout (`>>` prefix)', () => {
    const body = `> [!column | 3 flex no-title]
>> ## Am Körper
>> | Gegenstand | Anzahl | Gewicht | Gesamt |
>> | ---------- |:------:|:-------:|:------:|
>> | [[Dolch]] | 1 | 1 | 1 |
>> | **GESAMT** | | | 1 |
`
    expect(extractItemTable(body, 'Am Körper')).toEqual([{ name: 'Dolch', quantity: 1, weight_lb: 1 }])
  })

  it('falls back to frontmatter count/gewicht when the cell is a Meta-Bind INPUT placeholder', () => {
    const body = `## Am Körper
| Gegenstand | Anzahl | Gewicht | Gesamt |
| ---------- |:------:|:-------:|:------:|
| [[Dolch]] | \`INPUT[number:Inventar.Körper.count1]\` | \`INPUT[number:Inventar.Körper.gewicht1]\` | 0 |
|  | \`INPUT[number:Inventar.Körper.count2]\` | \`INPUT[number:Inventar.Körper.gewicht2]\` | 0 |
`
    const section = { count1: 2, gewicht1: 1, count2: 0, gewicht2: 0.5 }
    // Row 2 has no item name, so it's dropped regardless of its (unfilled, count 0) frontmatter slot.
    expect(extractItemTable(body, 'Am Körper', section)).toEqual([{ name: 'Dolch', quantity: 2, weight_lb: 1 }])
  })

  it('drops a named row whose resolved quantity is explicitly 0 (unfilled template slot)', () => {
    const body = `## Rucksack
| Gegenstand | Anzahl | Gewicht | Gesamt |
| ---------- |:------:|:-------:|:------:|
| [[Heiltrank]] | \`INPUT[number:Inventar.Rucksack.count1]\` | \`INPUT[number:Inventar.Rucksack.gewicht1]\` | 0 |
`
    expect(extractItemTable(body, 'Rucksack', { count1: 0, gewicht1: 0.5 })).toEqual([])
  })

  it('resolves a wikilink mixed with surrounding plain text in one cell', () => {
    const body = `## Am Körper
| Gegenstand | Anzahl | Gewicht | Gesamt |
| ---------- |:------:|:-------:|:------:|
| [[Arkaner Fokus]] - Kristall | 1 | 1 | 1 |
`
    expect(extractItemTable(body, 'Am Körper')).toEqual([{ name: 'Arkaner Fokus - Kristall', quantity: 1, weight_lb: 1 }])
  })

  it('treats an escaped pipe inside a wikilink alias as a literal character, not a column separator', () => {
    const body = `## Rucksack
| Gegenstand | Anzahl | Gewicht | Gesamt |
| ---------- |:------:|:-------:|:------:|
| [[Ritualbuch \\| Ritualbuch]] <br/> (Notiz) | 1 | 0.5 | 0.5 |
`
    expect(extractItemTable(body, 'Rucksack')).toEqual([{ name: 'Ritualbuch (Notiz)', quantity: 1, weight_lb: 0.5 }])
  })

  it('returns [] when the heading is not found', () => {
    expect(extractItemTable('# Nothing here', 'Am Körper')).toEqual([])
  })
})
