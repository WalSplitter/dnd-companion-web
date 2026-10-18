import { describe, expect, it } from 'vitest'
import { parseAppCommit } from './commitHistory'
import { commitMessage } from './commitMessage'
import type { PendingEdit } from './githubSync'

const field = (path: string, keyPath: string[], base: unknown, value: number, character?: string): PendingEdit => ({
  path,
  patch: { kind: 'field', keyPath, value },
  base,
  character,
})

describe('parseAppCommit', () => {
  it('reads back what commitMessage wrote', () => {
    const message = commitMessage(
      [
        field('Gruppe/Aldric.md', ['hp', 'current'], 14, 9, 'Aldric von Hohenwacht'),
        field('Gruppe/Spell Sheet Aldric.md', ['spellcasting', 'mana', 'current'], 9, 7, 'Aldric von Hohenwacht'),
        { path: 'Gruppe/Borin.md', patch: { kind: 'block', keyPath: ['endeavour_inventory'], value: { a: 'x'.repeat(90) } }, base: {}, character: 'Borin' },
        { path: 'Gruppe/Tagebuch Borin.md', patch: { kind: 'create', keyPath: [], value: '---\n---\n' }, base: undefined, character: 'Borin' },
        field('Gruppe/Borin.md', ['conditions', 'exhaustion'], undefined, 1, 'Borin'),
      ],
      'WalSplitter',
    )
    expect(parseAppCommit(message)).toEqual({
      editedBy: 'WalSplitter',
      groups: [
        {
          character: 'Aldric von Hohenwacht',
          changes: [
            { kind: 'set', key: 'hp.current', from: '14', to: '9', file: 'Aldric.md' },
            { kind: 'set', key: 'spellcasting.mana.current', from: '9', to: '7', file: 'Spell Sheet Aldric.md' },
          ],
        },
        {
          character: 'Borin',
          changes: [
            { kind: 'updated', key: 'endeavour_inventory', file: 'Borin.md' },
            { kind: 'created', note: 'Tagebuch Borin' },
            { kind: 'set', key: 'conditions.exhaustion', from: null, to: '1', file: 'Borin.md' },
          ],
        },
      ],
    })
  })

  it('has no editor without the Edited-by trailer', () => {
    expect(parseAppCommit(commitMessage([field('A.md', ['hp', 'current'], 3, 2, 'A')]))?.editedBy).toBeNull()
  })

  it('rejects commits made outside the app', () => {
    expect(parseAppCommit('vault backup: 2026-10-18 21:04:11')).toBeNull()
    expect(parseAppCommit('chore(aldric): update hp\n\nAldric:\n- hp.current: 3 → 2')).toBeNull()
  })
})
