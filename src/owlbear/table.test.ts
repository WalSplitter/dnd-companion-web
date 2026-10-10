import { describe, expect, it } from 'vitest'
import { OWLBEAR_INITIATIVE_KEY, writeInitiative } from './initiativeBridge'
import { MEDAL_STEP, arcPoints, markerContent, medalAngles } from './markers'
import { conditionRingFile, exhaustionRingFile, ringFiles } from './rings'
import { CONDITIONS, TABLE_KEY, byInitiative, readTable, type TableState } from './table'

describe('readTable', () => {
  it('reads conditions and initiative, skipping what this version does not know', () => {
    const table = readTable({
      [TABLE_KEY]: {
        Brann: { conditions: ['Liegend', 3], initiative: { order: 14, actions: 11, ap: 2, at: 1 } },
        Mira: { initiative: { order: 'hoch', at: 1 } },
      },
    })
    expect(table).toEqual({ Brann: { conditions: ['Liegend'], initiative: { order: 14, actions: 11, ap: 2, at: 1 } }, Mira: {} })
    expect(readTable({})).toEqual({})
  })
})

describe('byInitiative', () => {
  it('sorts by turn order, breaks ties with the action roll, and puts characters without initiative last', () => {
    const table: TableState = {
      A: { initiative: { order: 12, actions: 8, at: 1 } },
      B: { initiative: { order: 12, actions: 15, at: 1 } },
      C: { initiative: { order: 18, at: 1 } },
      D: {},
    }
    expect(['D', 'A', 'C', 'B'].sort(byInitiative(table))).toEqual(['C', 'B', 'A', 'D'])
  })
})

describe('writeInitiative', () => {
  it("updates Owlbear's initiative tracker, keeping whose turn it is", () => {
    const metadata: Record<string, unknown> = { [OWLBEAR_INITIATIVE_KEY]: { count: '0', active: true } }
    expect(writeInitiative(metadata, 17)).toBe(true)
    expect(metadata[OWLBEAR_INITIATIVE_KEY]).toEqual({ count: '17', active: true })
    expect(writeInitiative(metadata, 17)).toBe(false)
  })

  it("fills Clash's initiative field in the type Clash used, and adds no tracker the token isn't in", () => {
    const metadata: Record<string, unknown> = { 'com.battle-system.clash/clash_initiative': '', 'com.battle-system.clash/clash_currentHP': '4' }
    expect(writeInitiative(metadata, 9)).toBe(true)
    expect(metadata['com.battle-system.clash/clash_initiative']).toBe('9')
    expect(metadata['com.battle-system.clash/clash_currentHP']).toBe('4')
    expect(OWLBEAR_INITIATIVE_KEY in metadata).toBe(false)
  })
})

describe('markerContent', () => {
  const live = { hp: 5, hpMax: 10, temp: 0, ac: 2, by: '', byName: '', at: 1 }

  it('gives a single condition its own ring', () => {
    expect(markerContent(live, { conditions: ['Liegend'] })).toEqual({ ring: 'liegend.svg', medals: [] })
    expect(markerContent({ ...live, exhaustion: 2 }, {})).toEqual({ ring: 'erschoepft-2.svg', medals: [] })
  })

  it('puts several on one bare ring, a medallion each with exhaustion first, and the mana left', () => {
    expect(markerContent({ ...live, mana: 3, manaMax: 12, exhaustion: 2 }, { conditions: ['Liegend', 'Verängstigt'] })).toEqual({
      mana: 0.25,
      ring: 'band.svg',
      medals: ['medal-erschoepft-2.svg', 'medal-liegend.svg', 'medal-veraengstigt.svg'],
    })
  })

  it('folds medallions beyond the limit into "+n"', () => {
    const many = markerContent(live, { conditions: ['Blind', 'Taub', 'Liegend', 'Gepackt', 'Betäubt', 'Bedroht', 'Belastet', 'Benommen'] })
    expect(many?.medals).toHaveLength(6)
    expect(many?.medals.at(-1)).toBe('medal-more-3.svg')
  })

  it('spreads medallions evenly over the top', () => {
    expect(medalAngles(1)).toEqual([270])
    expect(medalAngles(3)).toEqual([270 - MEDAL_STEP, 270, 270 + MEDAL_STEP])
  })

  it('shows nothing for a character with neither', () => {
    expect(markerContent(live, {})).toBeUndefined()
    expect(markerContent(undefined, undefined)).toBeUndefined()
  })
})

describe('arcPoints', () => {
  it('draws an arc on the circle', () => {
    const points = arcPoints(10, 0, 90)
    expect(points[0]).toEqual({ x: 10, y: 0 })
    expect(points.at(-1)!.x).toBeCloseTo(0)
    expect(points.at(-1)!.y).toBeCloseTo(10)
  })
})

describe('condition rings', () => {
  it('has a ring for every condition and every exhaustion level', () => {
    const files = ringFiles()
    for (const condition of CONDITIONS) expect(files[conditionRingFile(condition)]).toContain(condition.toUpperCase())
    expect(files['erschoepft-1.svg']).toContain('ERSCHÖPFT')
    expect(exhaustionRingFile(12)).toBe('erschoepft-9.svg')
  })
})
