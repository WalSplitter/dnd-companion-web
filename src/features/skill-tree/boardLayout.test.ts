import { describe, expect, it } from 'vitest'
import type { ClassProgression, ProgressionNode } from '../../vault/adapters/classProgression'
import { layoutBoard, nodeState, roman, searchNodes } from './boardLayout'
import { iconFor } from './skillIconKeys'

const node = (id: string, level: number, family: string, fields: Partial<ProgressionNode> = {}): ProgressionNode => ({
  id,
  name: id,
  level,
  family,
  familyName: family,
  rank: 1,
  source: 'class',
  kind: 'feature',
  ...fields,
})

const progression = (nodes: ProgressionNode[], values = new Map()): ClassProgression => ({
  className: 'Test',
  level: 4,
  maxLevel: 20,
  nodes,
  values,
  fromTable: true,
  noteFound: true,
})

describe('layoutBoard', () => {
  const nodes = [
    node('a', 1, 'a'),
    node('b', 2, 'b'),
    node('rage1', 1, 'rage'),
    node('rage2', 5, 'rage', { rank: 2 }),
    node('c', 3, 'c'),
    node('stat1', 4, 'stat', { familyName: 'Kernattribut-Steigerung' }),
    node('stat2', 8, 'stat', { familyName: 'Kernattribut-Steigerung', rank: 2 }),
    node('s1', 3, 'subclass', { source: 'subclass', kind: 'subclass-choice' }),
    node('s2', 3, 'subclass', { source: 'subclass' }),
    node('cap', 20, 'cap'),
  ]
  const board = layoutBoard(progression(nodes, new Map([[1, [{ label: 'Wut', value: 'W4' }]], [2, [{ label: 'Wut', value: 'W4' }]], [6, [{ label: 'Wut', value: 'W6' }]]])))
  const cell = (id: string) => board.cells.find((c) => c.node.id === id)!

  it('packs single features into shared lanes and gives a ranked feature a stretch of its own', () => {
    expect(cell('a').lane).toBe(cell('b').lane)
    expect(cell('rage1').lane).toBe(cell('rage2').lane)
    expect(cell('rage1').lane).not.toBe(cell('a').lane)
    // Nothing sits inside the joined stretch of `rage` (levels 1–5).
    expect(board.cells.filter((c) => c.lane === cell('rage1').lane && c.node.family !== 'rage' && c.node.level <= 5)).toEqual([])
    expect(board.links).toEqual([['rage1', 'rage2']])
  })

  it('treats attribute increases as small, unjoined picks', () => {
    expect(cell('stat1').tier).toBe('minor')
    expect(board.links.some(([from]) => from === 'stat1')).toBe(false)
    expect(cell('cap').tier).toBe('keystone')
  })

  it('puts the subclass last, its picks of one level side by side', () => {
    expect(board.lanes.at(-1)?.kind).toBe('subclass')
    expect(cell('s1').lane).toBe(board.lanes.length - 1)
    expect([cell('s1').slot, cell('s2').slot, cell('s2').slots]).toEqual([0, 1, 2])
  })

  it('lists values only where they change', () => {
    expect([...board.changes.keys()]).toEqual([1, 6])
  })
})

describe('helpers', () => {
  it('splits unlocked, next and locked by level', () => {
    expect([1, 4, 5, 9].map((l) => nodeState({ level: l }, 4))).toEqual(['unlocked', 'unlocked', 'next', 'locked'])
  })
  it('searches name, family and description, ignoring accents', () => {
    const list = [node('Rücksichtslos', 2, 'r'), node('b', 3, 'b', { description: 'Heilt TP' })]
    expect(searchNodes(list, 'rucksicht')).toEqual(new Set(['Rücksichtslos']))
    expect(searchNodes(list, 'heilt')).toEqual(new Set(['b']))
    expect(searchNodes(list, ' ')).toBeNull()
  })
  it('writes ranks as roman numerals', () => {
    expect([1, 4, 9].map(roman)).toEqual(['I', 'IV', 'IX'])
  })
})

describe('iconFor', () => {
  it('picks an icon by keyword, the note can override it', () => {
    expect(iconFor(node('Kampfrausch', 1, 'kampfrausch'))).toBe('flame')
    expect(iconFor(node('Letzter Stoß', 5, 'x'))).toBe('skull')
    expect(iconFor(node('Hinterhältiger Angriff (2)', 3, 'x'))).toBe('sword')
    expect(iconFor(node('Schmutziger Trick', 4, 'x'))).toBe('mask')
    expect(iconFor(node('Stärkere Zaubertricks', 5, 'x'))).toBe('magic')
    expect(iconFor(node('Kernattribut-Steigerung', 4, 'x'))).toBe('attribute')
    expect(iconFor(node('Handauflegen', 1, 'x'))).toBe('heart')
    expect(iconFor(node('Unbekannt', 1, 'x', { description: 'Ein Pfeil trifft' }))).toBe('bow')
    expect(iconFor(node('Unbekannt', 1, 'x'))).toBe('rune')
    expect(iconFor(node('Kampfrausch', 1, 'x', { icon: 'Schild' }))).toBe('shield')
    expect(iconFor(node('Pfad', 3, 'subclass', { kind: 'subclass-choice' }))).toBe('choice')
  })
})
