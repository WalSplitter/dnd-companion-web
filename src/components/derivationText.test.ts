import { describe, expect, it } from 'vitest'
import { DICTIONARIES, type TranslateFn } from '../i18n/useI18n'
import { derivationText, levelPoolText } from './derivationText'

const t: TranslateFn = (key, vars = {}) => DICTIONARIES.de[key].replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name]))

describe('derivationText', () => {
  it('writes a modifier formula with its total', () => {
    expect(
      derivationText(t, [
        { kind: 'attribute', abbr: 'GE', value: 3 },
        { kind: 'proficiency', value: 2 },
      ]),
    ).toBe('GE +3 + Übung +2 = +5')
  })

  it('keeps a single term on its own', () => {
    expect(derivationText(t, [{ kind: 'attribute', abbr: 'IN', value: -1 }])).toBe('IN -1')
  })

  it('totals a fixed base as a plain number and subtracts exhaustion', () => {
    expect(
      derivationText(t, [
        { kind: 'constant', value: 8 },
        { kind: 'attribute', abbr: 'VS', value: 3 },
        { kind: 'exhaustion', value: -2 },
      ]),
    ).toBe('8 + VS +3 − Erschöpfung 2 = 9')
  })
})

describe('levelPoolText', () => {
  it('spells out each class share of the maximum', () => {
    expect(
      levelPoolText(
        t,
        'Trefferpunkte',
        32,
        [
          { className: 'Krieger', level: 2, levels: 3, base: 6, subclass: 0, attribute: 2 },
          { className: 'Arkanist', level: 1, levels: 1, base: 2, subclass: 1, attribute: 2 },
        ],
        'KO',
      ),
    ).toBe(
      'Maximum Trefferpunkte: 32. Krieger: (Stufe 2 + 1) × (Basis 6 + KO +2) = 24. Arkanist: (Stufe 1) × (Basis 2 + Subklasse +1 + KO +2) = 5. Die Startklasse zählt Stufe 1 doppelt; das Attribut zählt rückwirkend für jede Stufe',
    )
  })
})
