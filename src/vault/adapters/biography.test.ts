import { describe, expect, it } from 'vitest'
import { resolveBiography } from './biography'

describe('resolveBiography', () => {
  it('reads the own schema', () => {
    expect(
      resolveBiography({
        personality: ['Spricht wenig', 'Teilt sein Essen'],
        ideals: 'Niemand bleibt zurück.',
        bonds: 'Sein alter Trupp',
        flaws: 'Traut keinem Magier',
        appearance: { age: 87, eyes: 'grau', height: '1,35 m' },
      }),
    ).toEqual({
      personality: ['Spricht wenig', 'Teilt sein Essen'],
      ideals: 'Niemand bleibt zurück.',
      bonds: 'Sein alter Trupp',
      flaws: 'Traut keinem Magier',
      appearance: [
        { key: 'age', value: '87' },
        { key: 'height', value: '1,35 m' },
        { key: 'eyes', value: 'grau' },
      ],
    })
  })

  it('reads the older German sheet blocks and drops unfilled template rows', () => {
    expect(
      resolveBiography({
        Persönlichkeit: { Persönlichkeitsmerkmale: ['Neugierig', '', null], Ideale: 'Wissen', Bindungen: '', Makel: 'Ungeduldig' },
        Aussehen: { Geschlecht: 'weiblich', Haarfarbe: 'silber', Narbe: 'über dem linken Auge', Gewicht: '' },
      }),
    ).toEqual({
      personality: ['Neugierig'],
      ideals: 'Wissen',
      flaws: 'Ungeduldig',
      appearance: [
        { key: 'gender', value: 'weiblich' },
        { key: 'hair', value: 'silber' },
        { key: 'Narbe', value: 'über dem linken Auge' },
      ],
    })
  })

  it('accepts a simplified sheet with plain texts', () => {
    expect(resolveBiography({ Persönlichkeit: 'Laut und herzlich.', Aussehen: 'Groß, rote Haare, viele Narben.' })).toEqual({
      personality: ['Laut und herzlich.'],
      appearance_text: 'Groß, rote Haare, viele Narben.',
    })
  })

  it('is undefined when nothing is filled in', () => {
    expect(resolveBiography({ backstory: 'only a story', Aussehen: { Alter: '' } })).toBeUndefined()
  })
})
