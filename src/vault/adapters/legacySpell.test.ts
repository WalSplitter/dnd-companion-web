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

describe('legacy spell note adapter', () => {
  const vault = buildVault([spellFile, overviewFile])

  it('detects and normalizes an individual spell note', () => {
    expect(vault.spells).toHaveLength(1)
    const spell = vault.spells[0].frontmatter
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
})
