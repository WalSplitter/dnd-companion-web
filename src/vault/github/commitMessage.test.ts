import { describe, expect, it } from 'vitest'
import { commitMessage, fieldName } from './commitMessage'
import type { PendingEdit } from './githubSync'

const edit = (path: string, keyPath: string[], base: unknown, value: unknown, character?: string): PendingEdit => ({
  path,
  patch: typeof value === 'number' || typeof value === 'boolean' ? { kind: 'field', keyPath, value } : { kind: 'block', keyPath, value },
  base,
  character,
})

describe('fieldName', () => {
  it('names what a key path is about, not which part of it changed', () => {
    expect(fieldName(['hp', 'current'])).toBe('hp')
    expect(fieldName(['spellcasting', 'slots', '1', 'used'])).toBe('spell slots')
    expect(fieldName(['endeavour_inventory', 'containers'])).toBe('inventory')
    expect(fieldName(['InputData', 'Zauberplätze', 'Grad_1'])).toBe('Zauberplätze')
    expect(fieldName(['conditions', 'luck_points', '2'])).toBe('luck')
  })
})

describe('commitMessage', () => {
  it("groups by character and names a linked sheet's file only when a character spans several notes", () => {
    const message = commitMessage(
      [
        edit('Gruppe/Dummy/Dummy.md', ['hp', 'current'], 14, 13, 'Dummy Charakter'),
        edit('Gruppe/Dummy/Spell Sheet.md', ['spellcasting', 'mana', 'current'], 9, 7, 'Dummy Charakter'),
      ],
      'WalSplitter',
    )
    expect(message).toBe(
      [
        'chore(dummy-charakter): update hp and mana',
        'Dummy Charakter:\n- hp.current: 14 → 13 (Dummy.md)\n- spellcasting.mana.current: 9 → 7 (Spell Sheet.md)',
        'Edited-by: @WalSplitter\nVia: D&D Companion <https://github.com/WalSplitter/dnd-companion-web>',
      ].join('\n\n'),
    )
  })

  it('uses the vault as scope for several characters, and leaves out an unknown login', () => {
    const message = commitMessage([edit('A.md', ['hp'], 1, 2, 'Arwen'), edit('B.md', ['hp'], 3, 4, 'Brom'), edit('C.md', ['hp'], 5, 6)])
    expect(message.split('\n')[0]).toBe('chore(vault): update Arwen, Brom and C')
    expect(message).not.toContain('Edited-by')
    expect(message).toMatch(/Via: D&D Companion <.+>$/)
  })

  it('keeps the subject within 72 characters and summarises large blocks', () => {
    const keys = ['hp', 'resilience', 'exhaustion', 'mana', 'luck_points', 'hit_dice', 'initiative', 'speed', 'armor_class']
    const inventory = Array.from({ length: 5 }, (_, i) => ({ name: `Beutel ${i}`, slots: ['[[Seil]]', '[[Fackel]]'] }))
    const message = commitMessage([
      ...keys.map((k, i) => edit('Dummy.md', [k], i, i + 1, 'Dummy')),
      edit('Dummy.md', ['endeavour_inventory', 'containers'], [], inventory, 'Dummy'),
    ])
    const subject = message.split('\n')[0]
    expect(subject).toBe('chore(dummy): update 10 fields')
    expect(message).toContain('- endeavour_inventory.containers: updated')
  })
})
