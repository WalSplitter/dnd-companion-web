import { describe, expect, it } from 'vitest'
import type { CharacterFrontmatter } from '../../vault/types'
import { ENEMY_BAND_HEIGHT, formationRank, formationRanks, layoutFormation, RANK_FOOTPRINT, type FormationRank, type PlacedMember } from './formation'

const character = (classes: [string, number][], extra: Partial<CharacterFrontmatter> = {}) =>
  ({ name: classes[0]?.[0] ?? 'X', class: classes.map(([name, level]) => ({ name, level })), ...extra }) as CharacterFrontmatter

describe('formationRank', () => {
  it('places Endeavour and D&D classes by role', () => {
    expect(formationRank(character([['Krieger', 4]]))).toBe('front')
    expect(formationRank(character([['Gauner', 2]]))).toBe('middle')
    expect(formationRank(character([['Arkanist', 3]]))).toBe('back')
    expect(formationRank(character([['Fighter', 1]]))).toBe('front')
    expect(formationRank(character([['wizard', 5]]))).toBe('back')
  })

  it('uses the class with the most levels for multiclass characters', () => {
    expect(formationRank(character([['Arkanist', 1], ['Paladin', 4]]))).toBe('front')
  })

  it('lets the frontmatter override the class, in English or German', () => {
    expect(formationRank(character([['Krieger', 4]], { formation: 'hinten' }))).toBe('back')
    expect(formationRank(character([['Arkanist', 3]], { formation: 'Front' }))).toBe('front')
    expect(formationRank(character([['Arkanist', 3]], { formation: 'irgendwo' }))).toBe('back')
  })

  it('falls back to back for unknown casters and middle for everyone else', () => {
    expect(formationRank(character([['Hexer', 2]], { spellcasting: { ability: 'int' } as CharacterFrontmatter['spellcasting'] }))).toBe('back')
    expect(formationRank(character([['Hexer', 2]]))).toBe('middle')
  })
})

describe('formationRanks', () => {
  it('groups front to back in vault order and drops empty ranks', () => {
    const party = [character([['Arkanist', 3]]), character([['Krieger', 4]]), character([['Berserker', 2]])]
    expect(formationRanks(party, (c) => c).map((r) => [r.rank, r.members.map((c) => c.class[0].name)])).toEqual([
      ['front', ['Krieger', 'Berserker']],
      ['back', ['Arkanist']],
    ])
  })
})

describe('layoutFormation', () => {
  type M = { id: string; rank: FormationRank }
  const party = (counts: Partial<Record<FormationRank, number>>): { rank: FormationRank; members: M[] }[] =>
    (['front', 'middle', 'back'] as const)
      .filter((rank) => (counts[rank] ?? 0) > 0)
      .map((rank) => ({ rank, members: Array.from({ length: counts[rank]! }, (_, i) => ({ id: `${rank}${i}`, rank })) }))

  const overlaps = (placed: PlacedMember<M>[]) =>
    placed.some((a, i) =>
      placed.slice(i + 1).some((b) => {
        const ha = RANK_FOOTPRINT[a.rank].height * a.scale
        const hb = RANK_FOOTPRINT[b.rank].height * b.scale
        const wa = a.width * a.scale
        const wb = b.width * b.scale
        return Math.abs(a.x - b.x) < (wa + wb) / 2 && a.y < b.y + hb && b.y < a.y + ha
      }),
    )

  it('never lets two members overlap, on wide and narrow stages', () => {
    for (const width of [1100, 760, 360]) {
      for (const counts of [{ front: 1, back: 1 }, { front: 1, middle: 2, back: 1 }, { front: 2, middle: 2, back: 2 }, { front: 4, back: 3 }, { middle: 6 }]) {
        const { placed } = layoutFormation(party(counts), width, (m) => m.id)
        expect(overlaps(placed), `${width}px ${JSON.stringify(counts)}`).toBe(false)
        for (const m of placed) {
          expect(m.x - (m.width * m.scale) / 2).toBeGreaterThanOrEqual(0)
          expect(m.x + (m.width * m.scale) / 2).toBeLessThanOrEqual(width)
        }
      }
    }
  })

  it('stands 1/2/1 as a diamond: front on top, back at the bottom, the middle pair to the sides', () => {
    const { placed } = layoutFormation(party({ front: 1, middle: 2, back: 1 }), 1100, (m) => m.id)
    const at = (id: string) => placed.find((m) => m.entry.id === id)!
    const [back, left, right, front] = [at('back0'), at('middle0'), at('middle1'), at('front0')]
    expect(front.y).toBeLessThan(left.y)
    expect(left.y).toBeLessThan(back.y)
    expect(left.x).toBeLessThan(back.x)
    expect(right.x).toBeGreaterThan(back.x)
    expect(Math.abs(back.x - front.x)).toBeLessThan(20)
    // Staggered lines slide into each other instead of stacking as full rows.
    expect(back.y - front.y).toBeLessThan(RANK_FOOTPRINT.front.height + RANK_FOOTPRINT.middle.height)
  })

  it('keeps the enemy band at the top of the stage clear of the front line', () => {
    for (const width of [1100, 360]) {
      const { placed, enemyBand } = layoutFormation(party({ front: 2, middle: 2, back: 2 }), width, (m) => m.id)
      expect(enemyBand).toBe(ENEMY_BAND_HEIGHT * (width < 560 ? 0.8 : 1))
      for (const m of placed) expect(m.y, `${width}px ${m.entry.id}`).toBeGreaterThanOrEqual(enemyBand)
    }
  })
})
