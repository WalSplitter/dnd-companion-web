import { describe, expect, it } from 'vitest'
import { parseRawFile } from '../rawFile'
import {
  compareEndeavourItemSize,
  looksLikeEndeavourItem,
  normalizeEndeavourItem,
  resolveItemSize,
  resolveSlotCost,
  type EndeavourItemFrontmatter,
} from './endeavourItem'

// Fixtures are synthetic — built from the inferred field schema in `docs/inventory-vault-alignment.md`,
// not real notes (none exist in the new vault yet). These only guard the parsing logic itself; they
// will need replacing with real fixtures once the DM ships actual item notes.

function raw(path: string, content: string) {
  return parseRawFile({ path, content })
}

describe('looksLikeEndeavourItem', () => {
  it('matches a Gegenstand/Waffe tag', () => {
    expect(looksLikeEndeavourItem({ tags: ['Gegenstand/Waffe/Klasse/Nahkampfwaffe'] })).toBe(true)
  })

  it('matches the inconsistently-named bare Werkzeug tag', () => {
    expect(looksLikeEndeavourItem({ tags: ['Werkzeug'] })).toBe(true)
  })

  it('does not match an unrelated tag', () => {
    expect(looksLikeEndeavourItem({ tags: ['Regeln/Nimble'] })).toBe(false)
  })

  it('does not match when tags is missing entirely', () => {
    expect(looksLikeEndeavourItem({})).toBe(false)
  })
})

describe('normalizeEndeavourItem', () => {
  it('normalizes a melee weapon', () => {
    const file = raw(
      'Streitaxt.md',
      `---
tags: [Gegenstand/Waffe/Klasse/Nahkampfwaffe]
Größe: Mittel
Gewicht: Schwer
Kosten: 10 GM
Hände: 1
Kategorie: Martial
Verfügbarkeit: Verbreitet
Reichweite: 5 ft
Schaden: 1d8
Schadensart: "[[Hiebschaden]]"
Eigenschaften: ["[[Vielseitig]]"]
---
`,
    )
    expect(normalizeEndeavourItem(file)).toEqual({
      name: 'Streitaxt',
      size: 'mittel',
      weight_class: 'schwer',
      cost: '10 GM',
      kind: 'weapon',
      weapon_kind: 'melee',
      hands: 'one',
      category: 'Martial',
      availability: 'Verbreitet',
      range: '5 ft',
      damage_dice: '1d8',
      damage_type: 'Hiebschaden',
      properties: ['Vielseitig'],
    })
  })

  it('normalizes a thrown weapon', () => {
    const file = raw(
      'Wurfmesser.md',
      `---
tags: [Gegenstand/Waffe/Klasse/Fernkampfwaffe/Wurfwaffe]
---
`,
    )
    expect(normalizeEndeavourItem(file).kind === 'weapon' && (normalizeEndeavourItem(file) as { weapon_kind: string }).weapon_kind).toBe(
      'thrown',
    )
  })

  it('normalizes armor, capturing both RK and RP', () => {
    const file = raw(
      'Kettenhemd.md',
      `---
tags: [Gegenstand/Rüstung]
Klasse: Mittel
RK: 14
RP: 2
SR: 1
Stärke: 13
Heimlichkeit: true
BW_cap: 6
---
`,
    )
    expect(normalizeEndeavourItem(file)).toEqual({
      name: 'Kettenhemd',
      size: undefined,
      weight_class: undefined,
      cost: undefined,
      kind: 'armor',
      armor_category: 'Mittel',
      rk: 14,
      rp: 2,
      damage_reduction: 1,
      strength_requirement: 13,
      stealth_disadvantage: true,
      speed_cap: 6,
    })
  })

  it('normalizes a shield', () => {
    const file = raw(
      'Schild.md',
      `---
tags: [Gegenstand/Schild]
RK: 2
SR: 1
---
`,
    )
    expect(normalizeEndeavourItem(file)).toEqual({
      name: 'Schild',
      size: undefined,
      weight_class: undefined,
      cost: undefined,
      kind: 'shield',
      rk: 2,
      rp: undefined,
      damage_reduction: 1,
    })
  })

  it('normalizes a magic item', () => {
    const file = raw(
      'Ring der Unsichtbarkeit.md',
      `---
tags: [Gegenstand/Magischer_Gegenstand]
Art: Ring
Seltenheit: Selten
Einstimmung: true
Verflucht: false
Voraussetzung: "Keine"
---
`,
    )
    expect(normalizeEndeavourItem(file)).toEqual({
      name: 'Ring der Unsichtbarkeit',
      size: undefined,
      weight_class: undefined,
      cost: undefined,
      kind: 'magic_item',
      magic_type: 'Ring',
      rarity: 'Selten',
      requires_attunement: true,
      cursed: false,
      requirement: 'Keine',
    })
  })

  it('falls back to kind tool for an unrecognized Gegenstand tag', () => {
    const file = raw(
      'Alchemistenausruestung.md',
      `---
tags: [Werkzeug]
---
`,
    )
    expect(normalizeEndeavourItem(file)).toEqual({
      name: 'Alchemistenausruestung',
      size: undefined,
      weight_class: undefined,
      cost: undefined,
      kind: 'tool',
    })
  })

  it('normalizes real-schema generic equipment (Gegenstand/Ausrüstung)', () => {
    const file = raw(
      'Schaufel.md',
      `---
tags: [Gegenstand/Ausrüstung]
Kosten: 2 GM
Plaetze: 2
Stapelgroesse: 1
---
`,
    )
    expect(normalizeEndeavourItem(file)).toEqual({
      name: 'Schaufel',
      size: undefined,
      weight_class: undefined,
      cost: '2 GM',
      plaetze: 2,
      kind: 'equipment',
      stack_size: 1,
    })
  })

  it('normalizes a real-schema container (Gegenstand/Behälter)', () => {
    const file = raw(
      'Rucksack (Groß).md',
      `---
tags: [Gegenstand/Behälter]
Kosten: 4 GM
Plaetze: 15
MaxGroesse: Groß
---
`,
    )
    expect(normalizeEndeavourItem(file)).toEqual({
      name: 'Rucksack (Groß)',
      size: undefined,
      weight_class: undefined,
      cost: '4 GM',
      plaetze: 15,
      kind: 'container',
      max_size: 'gross',
    })
  })
})

describe('resolveSlotCost', () => {
  it('uses Plaetze directly when present (real schema)', () => {
    expect(resolveSlotCost({ name: 'Zelt', kind: 'equipment', plaetze: 4 })).toBe(4)
  })

  it('falls back to the Größe+Gewicht derivation when Plaetze is absent (speculative schema)', () => {
    const mittelSchwer: EndeavourItemFrontmatter = { name: 'Vorschlaghammer', kind: 'tool', size: 'klein', weight_class: 'schwer' }
    expect(resolveSlotCost(mittelSchwer)).toBe(2)
    const sehrSchwer: EndeavourItemFrontmatter = { name: 'Amboss', kind: 'tool', size: 'gross', weight_class: 'sehr_schwer' }
    expect(resolveSlotCost(sehrSchwer)).toBe(5)
  })

  it('returns undefined when neither Plaetze nor size is known', () => {
    expect(resolveSlotCost({ name: 'Unbekannt', kind: 'tool' })).toBeUndefined()
  })
})

describe('resolveItemSize', () => {
  it('prefers an explicit Größe field', () => {
    expect(resolveItemSize({ name: 'Langschwert', kind: 'weapon', weapon_kind: 'melee', size: 'mittel', plaetze: 1 })).toBe('mittel')
  })

  it('approximates size from Plaetze when no explicit size is set', () => {
    expect(resolveItemSize({ name: 'Zelt', kind: 'equipment', plaetze: 4 })).toBe('sehr_gross')
    expect(resolveItemSize({ name: 'Köcher', kind: 'equipment', plaetze: 1 })).toBe('klein')
  })
})

describe('compareEndeavourItemSize', () => {
  it('orders Klein < Mittel < Groß < Sehr groß', () => {
    expect(compareEndeavourItemSize('klein', 'mittel')).toBeLessThan(0)
    expect(compareEndeavourItemSize('sehr_gross', 'gross')).toBeGreaterThan(0)
    expect(compareEndeavourItemSize('gross', 'gross')).toBe(0)
  })
})
