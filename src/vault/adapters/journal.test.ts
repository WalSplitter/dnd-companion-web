import { describe, expect, it } from 'vitest'
import { parseRawFile } from '../rawFile'
import { applyPatch, journalPatch } from '../writeback/persist'
import { currentSession, parseJournal, resolveJournal, serializeJournal } from './journal'

const raw = (path: string, content: string) => parseRawFile({ path, content })
const strip = <T extends { id: string }>(list: T[]) => list.map(({ id: _id, ...rest }) => rest)

describe('parseJournal', () => {
  it('reads entries, normalizing dates and unknown kinds and dropping empty ones', () => {
    const { data } = raw(
      'T.md',
      `---\njournal:\n  - session: 3\n    date: 2026-09-04\n    kind: quest\n    title: Hain reinigen\n    done: true\n    text: Quellwasser holen.\n  - kind: dragon\n    text: Unbekannte Art\n  - Nur ein Satz\n  - kind: note\n---\n`,
    )
    expect(strip(parseJournal(data.journal))).toEqual([
      { session: 3, date: '2026-09-04', kind: 'quest', title: 'Hain reinigen', done: true, text: 'Quellwasser holen.' },
      { kind: 'note', text: 'Unbekannte Art' },
      { kind: 'note', text: 'Nur ein Satz' },
    ])
  })

  it('gives every entry its own id', () => {
    const ids = parseJournal(['a', 'b', 'c']).map((e) => e.id)
    expect(new Set(ids).size).toBe(3)
  })
})

describe('journal write-back', () => {
  it('round-trips through the frontmatter, keeping text in its own language', () => {
    const entries = parseJournal([
      { session: 7, date: '2026-10-16', kind: 'lore', title: 'Der Brief', pinned: true, text: 'Zeile eins\n\n> Zitat: „Mond“' },
      { kind: 'npc', text: "Varis' Ring" },
    ])
    const written = applyPatch('---\nCharakter: "[[Fenn]]"\n---\nBody\n', journalPatch(entries))
    const read = parseJournal(raw('T.md', written).data.journal)
    expect(strip(read)).toEqual(strip(entries))
    expect(written).toMatch(/date: '2026-10-16'/)
    expect(written.endsWith('---\nBody\n')).toBe(true)
  })

  it('leaves out runtime ids and false flags', () => {
    expect(serializeJournal([{ id: 'x', kind: 'note', text: 'Hi', pinned: false, done: false }])).toEqual([{ kind: 'note', text: 'Hi' }])
  })

  it('removes the key once the journal is empty', () => {
    const content = '---\nCharakter: "[[Fenn]]"\njournal:\n  - kind: note\n    text: weg\n---\n'
    expect(applyPatch(content, journalPatch([]))).toBe('---\nCharakter: "[[Fenn]]"\n---\n')
  })
})

describe('resolveJournal', () => {
  const own = raw('Gruppe/Fenn/Fenn Flinkfinger.md', '---\ntype: character\nname: Fenn Flinkfinger\n---\n')

  it('plans a new Tagebuch note next to the character when none exists', () => {
    const { journal, target } = resolveJournal(own, [own])
    expect(journal).toEqual([])
    expect(target.path).toBe('Gruppe/Fenn/Tagebuch Fenn Flinkfinger.md')
    expect(target.create).toContain('Charakter: "[[Fenn Flinkfinger]]"')
  })

  it('reads a back-linked note carrying the journal', () => {
    const linked = raw('Gruppe/Fenn/Tagebuch Fenn.md', '---\nCharakter: "[[Fenn Flinkfinger]]"\njournal:\n  - Notiz\n---\n')
    const { journal, target } = resolveJournal(own, [own, linked])
    expect(journal.map((e) => e.text)).toEqual(['Notiz'])
    expect(target).toEqual({ path: 'Gruppe/Fenn/Tagebuch Fenn.md' })
  })

  it('writes into an existing, still empty back-linked Tagebuch note instead of creating one', () => {
    const linked = raw('Gruppe/Fenn/Tagebuch.md', '---\nCharakter: "[[Fenn Flinkfinger]]"\n---\n')
    expect(resolveJournal(own, [own, linked]).target).toEqual({ path: 'Gruppe/Fenn/Tagebuch.md' })
  })

  it('prefers a journal on the character file itself', () => {
    const inline = raw('Fenn Flinkfinger.md', '---\ntype: character\nname: Fenn Flinkfinger\njournal:\n  - Eigene\n---\n')
    const linked = raw('Tagebuch Fenn.md', '---\nCharakter: "[[Fenn Flinkfinger]]"\njournal:\n  - Verlinkt\n---\n')
    const { journal, target } = resolveJournal(inline, [inline, linked])
    expect(journal.map((e) => e.text)).toEqual(['Eigene'])
    expect(target.path).toBe('Fenn Flinkfinger.md')
  })
})

describe('currentSession', () => {
  it('is the highest session written so far', () => {
    expect(currentSession(parseJournal([{ session: 2, text: 'a' }, { text: 'b' }, { session: 5, text: 'c' }, { session: 3, text: 'd' }]))).toBe(5)
    expect(currentSession([])).toBeUndefined()
  })
})
