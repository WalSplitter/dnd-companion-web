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

// Weapon/container/equipment fixtures below are trimmed excerpts of real notes under
// `01 - Spielerbereich/Gegenstände/` in the Endeavour vault (e.g. Kurzschwert.md, Langbogen.md,
// Rucksack (Groß).md). Armor/shield are close to real notes but still carry a couple of unconfirmed
// guesses (see `endeavourItem.ts`'s doc comments); magic_item/tool are still fully synthetic — no real
// note of either kind exists yet.

function raw(path: string, content: string) {
  return parseRawFile({ path, content })
}

describe('looksLikeEndeavourItem', () => {
  it('matches a Gegenstand/Waffe tag', () => {
    expect(looksLikeEndeavourItem({ tags: ['Gegenstand/Waffe/Nahkampfwaffe'] })).toBe(true)
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
  it('normalizes a melee weapon (Kurzschwert.md)', () => {
    const file = raw(
      'Kurzschwert.md',
      `---
tags:
  - Gegenstand/Waffe/Nahkampfwaffe
  - Gegenstand/Waffe/Schwert
  - Gegenstand/Waffe/Kriegswaffe
Reichweite: 1,5(1)
Schaden: 1d6
Schadensart: "[[Hiebschaden]]"
Eigenschaften:
  - "[[Finesse]]"
  - "[[Leicht]]"
SchadenFern:
SchadensartFern:
Hände: 1
Plaetze: 1
Kosten: 15 GM
Verfügbarkeit: gewöhnlich
---
`,
    )
    expect(normalizeEndeavourItem(file)).toEqual({
      name: 'Kurzschwert',
      size: undefined,
      weight_class: undefined,
      cost: '15 GM',
      plaetze: 1,
      kind: 'weapon',
      weapon_kind: 'melee',
      hands: 'one',
      category: 'Kriegswaffe',
      availability: 'gewöhnlich',
      range: '1,5(1)',
      damage_dice: '1d6',
      damage_type: 'Hiebschaden',
      properties: ['Finesse', 'Leicht'],
    })
  })

  it('normalizes a ranged-only weapon, reading the SchadenFern/Range field set (Langbogen.md)', () => {
    const file = raw(
      'Langbogen.md',
      `---
tags:
  - Gegenstand/Waffe/Bogen
  - Gegenstand/Waffe/Fernkampfwaffe/Schusswaffe
  - Gegenstand/Waffe/Kriegswaffe
Reichweite:
Schaden:
Schadensart:
SchadenFern: 1d10
SchadensartFern: "[[Stichschaden]]"
Range1: 4,5(3)
Range2: 24(16)
Range3: 48(32)
EigenschaftenFern:
  - "[[Geschosse]] (Pfeile)"
Hände: 2
Plaetze: 2
Kosten: 50 GM
Verfügbarkeit: ungewöhnlich
---
`,
    )
    expect(normalizeEndeavourItem(file)).toEqual({
      name: 'Langbogen',
      size: undefined,
      weight_class: undefined,
      cost: '50 GM',
      plaetze: 2,
      kind: 'weapon',
      weapon_kind: 'ranged',
      hands: 'two',
      category: 'Kriegswaffe',
      availability: 'ungewöhnlich',
      range: '4,5(3)/24(16)/48(32)',
      damage_dice: '1d10',
      damage_type: 'Stichschaden',
      // `linkDisplay` only strips a wikilink that spans the *whole* string; "[[Geschosse]] (Pfeile)"
      // has trailing text, so it passes through unchanged (matches `propertyLabels`'s real behavior).
      properties: ['[[Geschosse]] (Pfeile)'],
    })
  })

  it('picks the melee profile for a dual-purpose thrown weapon (Speer.md)', () => {
    const file = raw(
      'Speer.md',
      `---
tags:
  - Gegenstand/Waffe/Nahkampfwaffe
  - Gegenstand/Waffe/Fernkampfwaffe/Wurfwaffe
  - Gegenstand/Waffe/Einfach
Reichweite: 3(2)
Schaden: 1d6
Schadensart: "[[Stichschaden]]"
SchadenFern: 1d6
SchadensartFern: "[[Stichschaden]]"
Range1: 3(2)
Range2: 12(8)
Range3: 24(16)
Hände: 1
Plaetze: 3
Kosten: 2 GM
Verfügbarkeit: häufig
---
`,
    )
    const item = normalizeEndeavourItem(file)
    expect(item.kind === 'weapon' && item.weapon_kind).toBe('melee')
    expect(item.kind === 'weapon' && item.range).toBe('3(2)')
    expect(item.kind === 'weapon' && item.category).toBe('Einfach')
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
Heimlichkeit: -1
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
      stealth_disadvantage: -1,
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
