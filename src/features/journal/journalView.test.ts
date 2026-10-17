import { describe, expect, it } from 'vitest'
import type { JournalEntry } from '../../vault/types'
import { countByKind, filterEntries, groupBySession, todayIso, updateEntry } from './journalView'

const entry = (id: string, fields: Partial<JournalEntry> = {}): JournalEntry => ({ id, kind: 'note', text: id, ...fields })

describe('groupBySession', () => {
  it('puts the newest session first, the newest entry first within it, and session-less notes last', () => {
    const groups = groupBySession([
      entry('a', { session: 1, date: '2026-08-21' }),
      entry('b'),
      entry('c', { session: 2, date: '2026-08-28' }),
      entry('d', { session: 1, date: '2026-08-22' }),
    ])
    expect(groups.map((g) => [g.session, g.entries.map((e) => e.id)])).toEqual([
      [2, ['c']],
      [1, ['d', 'a']],
      [undefined, ['b']],
    ])
    expect(groups[1]).toMatchObject({ from: '2026-08-21', to: '2026-08-22' })
  })
})

describe('filterEntries', () => {
  const entries = [entry('a', { title: 'Brücke am Moor', kind: 'place' }), entry('b', { text: 'Varis lügt', kind: 'npc' }), entry('c', { kind: 'quest', text: 'Die Brücke reparieren' })]

  it('matches every word of the query in title or text, ignoring case and accents', () => {
    expect(filterEntries(entries, { kind: 'all', query: 'brucke' }).map((e) => e.id)).toEqual(['a', 'c'])
    expect(filterEntries(entries, { kind: 'all', query: 'brücke moor' }).map((e) => e.id)).toEqual(['a'])
  })

  it('narrows to one kind', () => {
    expect(filterEntries(entries, { kind: 'quest', query: '' }).map((e) => e.id)).toEqual(['c'])
    expect(countByKind(entries)).toEqual({ place: 1, npc: 1, quest: 1 })
  })
})

describe('updateEntry', () => {
  it('replaces or removes one entry, keeping the order', () => {
    const list = [entry('a'), entry('b'), entry('c')]
    expect(updateEntry(list, 'b', (e) => ({ ...e, pinned: true })).map((e) => [e.id, e.pinned])).toEqual([
      ['a', undefined],
      ['b', true],
      ['c', undefined],
    ])
    expect(updateEntry(list, 'b', () => null).map((e) => e.id)).toEqual(['a', 'c'])
  })
})

it('todayIso uses the local calendar day', () => {
  expect(todayIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
})
