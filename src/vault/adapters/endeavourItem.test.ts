import { describe, expect, it } from 'vitest'
import { parseRawFile } from '../rawFile'
import { looksLikeEndeavourItem, normalizeEndeavourItem } from './endeavourItem'

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
})
