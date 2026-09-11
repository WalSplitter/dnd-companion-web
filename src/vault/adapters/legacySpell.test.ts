import { describe, expect, it } from 'vitest'
import { buildVault } from '../parseFrontmatter'

const spellFile = {
  path: 'Zauber/Zaubersprüche/Feuerkugel.md',
  content: `---
tags:
  - Zauber
  - Regeln/PHB2024
Grad: 3
Schule: "[[Hervorrufungszauber|Hervorrufung]]"
Zeitaufwand: "[[Aktion]]"
Reichweite: 45 Meter
Verbal: true
Geste: true
Material: true
Materialkosten: "eine winzige Kugel aus Fledermausguano und Schwefel"
Dauer: Sofort
Konzentration: false
Ritual: false
Skalierbar: false
Schaden: 8d6
Schadensart: "[[Feuerschaden]]"
Ziel: Einzel
Rettungswurf: "[[Geschicklichkeit|GES]]"
Typ: "[[Debuff]]"
Klassen:
  - "[[Magier]]"
  - "[[Zauberer]]"
---
Eine leuchtende Kugel schießt zu einem Punkt deiner Wahl und explodiert in einer Feuersbrunst.
`,
}

const overviewFile = {
  path: 'Zauber/Zaubertypen/Buff.md',
  content: `---\ntags: [Zauber]\n---\nZauber, die Werte verbessern.`,
}

const cantripFile = {
  path: 'Zauber/Zaubersprüche/Gedankensplitter.md',
  content: `---
Grad: 0
Schule: "[[Verzauberungen|Verzauberung]]"
Zeitaufwand: "[[Aktion]]"
Reichweite: 18 Meter
Verbal: true
Geste: false
Material: false
Dauer: 1 Runde
Konzentration: false
Ritual: false
Skalierbar: true
Schaden: 1d6
SchadenLv5: 2d6
SchadenLv11: 3d6
SchadenLv17: 4d6
Schadensart: "[[Psychischer Schaden]]"
Rettungswurf: "[[Intelligenz|INT]]"
---
Testtext.`,
}

describe('legacy spell note adapter', () => {
  const vault = buildVault([spellFile, overviewFile, cantripFile])

  it('detects and normalizes an individual spell note', () => {
    expect(vault.spells).toHaveLength(2)
    const spell = vault.spells.find((s) => s.frontmatter.name === 'Feuerkugel')!.frontmatter
    expect(spell.name).toBe('Feuerkugel')
    expect(spell.level).toBe(3)
    expect(spell.school).toBe('Hervorrufung')
    expect(spell.casting_time).toBe('Aktion')
    expect(spell.range).toBe('45 Meter')
    expect(spell.components).toEqual(['V', 'S', 'M'])
    expect(spell.duration).toBe('Sofort')
    expect(spell.classes).toEqual(['Magier', 'Zauberer'])
  })

  it('does not mistake a rules/overview page for a spell note', () => {
    expect(vault.spells.find((s) => s.path === overviewFile.path)).toBeUndefined()
  })

  it('maps damage, save ability, target and type fields', () => {
    const spell = vault.spells.find((s) => s.frontmatter.name === 'Feuerkugel')!.frontmatter
    expect(spell.damage).toBe('8d6')
    expect(spell.damage_type).toBe('Feuerschaden')
    expect(spell.target).toBe('Einzel')
    expect(spell.save_ability).toBe('dex')
    expect(spell.spell_type).toBe('Debuff')
    expect(spell.scalable).toBe(false)
  })

  it('maps cantrip damage scaling breakpoints', () => {
    const cantrip = vault.spells.find((s) => s.frontmatter.name === 'Gedankensplitter')!.frontmatter
    expect(cantrip.damage).toBe('1d6')
    expect(cantrip.damage_scaling).toEqual([
      { at_level: 5, dice: '2d6' },
      { at_level: 11, dice: '3d6' },
      { at_level: 17, dice: '4d6' },
    ])
    expect(cantrip.save_ability).toBe('int')
    expect(cantrip.scalable).toBe(true)
  })
})
