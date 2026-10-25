import { describe, expect, it } from 'vitest'
import { DICTIONARIES, type TranslateFn } from '../i18n/useI18n'
import type { CharacterFrontmatter } from '../vault/types'
import { movementHint, movementReduced } from './vitalsDisplay'

const t: TranslateFn = (key, vars = {}) => DICTIONARIES.de[key].replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name]))
const character = (conditions: CharacterFrontmatter['conditions']) => ({ speed: '9 m', conditions }) as CharacterFrontmatter

describe('movementHint', () => {
  it('names every malus that takes squares off, and only then marks the plate', () => {
    expect(movementReduced(character(undefined))).toBe(false)
    expect(movementHint(t, character(undefined), 6)).toBe('Bewegung: 6 Felder pro Zug (9 m)')

    const both = character({ exhaustion: 2, active: ['Belastet'] })
    expect(movementReduced(both)).toBe(true)
    expect(movementHint(t, both, 2)).toBe('Bewegung: 2 Felder pro Zug (9 m). Erschöpfung: −2 Felder (−1,5 m pro Stufe). Belastet: −2 Felder (−3 m)')
    expect(movementReduced(character({ active: ['Belastet'] }))).toBe(true)
  })
})
