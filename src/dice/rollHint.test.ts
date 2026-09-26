import { describe, expect, it } from 'vitest'
import { DICTIONARIES, type TranslateFn } from '../i18n/useI18n'
import { d20RollHint, damageRollHint } from './rollHint'

const t: TranslateFn = (key, vars = {}) => DICTIONARIES.de[key].replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name]))

describe('d20RollHint', () => {
  it('names the roll and the Shift/Alt keys', () => {
    expect(d20RollHint(t, 'Athletik', 1, 0)).toBe('Athletik: W20 +1. Klicken zum Würfeln · Shift = Vorteil · Alt = Nachteil')
  })

  it('adds the exhaustion breakdown and shows the adjusted value', () => {
    expect(d20RollHint(t, 'Athletik', 1, 10)).toBe(
      'Athletik: W20 -9. Grundwert +1, Erschöpfung −10. Klicken zum Würfeln · Shift = Vorteil · Alt = Nachteil',
    )
  })

  it('puts a note on what the roll is for before the keys', () => {
    expect(d20RollHint(t, 'Kurzschwert Angriff', 2, 2, 'Trifft bei Ergebnis ≥ Ausweichwert des Ziels')).toBe(
      'Kurzschwert Angriff: W20 +0. Grundwert +2, Erschöpfung −2. Trifft bei Ergebnis ≥ Ausweichwert des Ziels. Klicken zum Würfeln · Shift = Vorteil · Alt = Nachteil',
    )
  })
})

describe('damageRollHint', () => {
  it('names the formula and the Shift key', () => {
    expect(damageRollHint(t, 'Kurzschwert Schaden', '1d6+2')).toBe('Kurzschwert Schaden: 1d6+2. Klicken zum Würfeln · Shift = Kritisch')
  })

  it('puts a note on when the damage is rolled before the key', () => {
    expect(damageRollHint(t, 'Kurzschwert Schaden', '1d6+2', 'Nach einem Treffer würfeln')).toBe(
      'Kurzschwert Schaden: 1d6+2. Nach einem Treffer würfeln. Klicken zum Würfeln · Shift = Kritisch',
    )
  })
})
