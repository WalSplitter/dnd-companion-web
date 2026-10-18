import { describe, expect, it } from 'vitest'
import { commitMessage } from '../../vault/github/commitMessage'
import type { GitHubCommit } from '../../vault/github/githubApi'
import { buildChronicle } from './chronicle'

let n = 0
function appCommit(date: string, character: string, key: string[], from: number, to: number): GitHubCommit {
  const message = commitMessage([{ path: `${character}.md`, patch: { kind: 'field', keyPath: key, value: to }, base: from, character }], 'player')
  return { sha: `s${++n}`, message, date, login: 'player', authorName: 'Player', url: `https://github.com/c/${n}` }
}
const manual = (date: string, message: string, login: string | null = null): GitHubCommit => ({
  sha: `m${++n}`,
  message,
  date,
  login,
  authorName: 'DM',
  url: `https://github.com/c/${n}`,
})

describe('buildChronicle', () => {
  it('nets each field over a session, newest session first', () => {
    const sessions = buildChronicle(
      [
        appCommit('2026-10-10T19:00:00Z', 'Aldric', ['hp', 'current'], 20, 14),
        appCommit('2026-10-10T20:30:00Z', 'Aldric', ['hp', 'current'], 14, 5),
        appCommit('2026-10-10T21:00:00Z', 'Borin', ['luck_points'], 3, 2),
        // Past midnight, still the same evening.
        appCommit('2026-10-11T00:30:00Z', 'Aldric', ['hp', 'current'], 5, 20),
        appCommit('2026-10-17T19:00:00Z', 'Borin', ['hp', 'current'], 30, 25),
      ].reverse(),
    )
    expect(sessions).toHaveLength(2)
    expect(sessions[0].characters).toEqual([{ name: 'Borin', editors: ['player'], changes: [{ kind: 'set', key: 'hp.current', from: '30', to: '25', steps: 1 }] }])
    expect(sessions[1].commits).toBe(4)
    expect(sessions[1].start.toISOString()).toBe('2026-10-10T19:00:00.000Z')
    expect(sessions[1].end.toISOString()).toBe('2026-10-11T00:30:00.000Z')
    expect(sessions[1].characters.map((c) => [c.name, c.changes])).toEqual([
      ['Aldric', [{ kind: 'set', key: 'hp.current', from: '20', to: '20', steps: 3 }]],
      ['Borin', [{ kind: 'set', key: 'luck_points', from: '3', to: '2', steps: 1 }]],
    ])
  })

  it('collapses foreign commits per author into a manual edit', () => {
    const [session] = buildChronicle([
      manual('2026-10-10T19:00:00Z', 'vault backup: 2026-10-10 19:00:00'),
      manual('2026-10-10T19:10:00Z', 'vault backup: 2026-10-10 19:10:00'),
      manual('2026-10-10T19:20:00Z', 'Add session notes\n\nlong body', 'dm-login'),
    ])
    expect(session.characters).toEqual([])
    expect(session.manual).toEqual([
      { author: 'DM', count: 2, subjects: ['vault backup: 2026-10-10 19:00:00', 'vault backup: 2026-10-10 19:10:00'], url: expect.stringMatching(/c\/\d+$/) },
      { author: 'dm-login', count: 1, subjects: ['Add session notes'], url: expect.any(String) },
    ])
  })

  it('is empty without commits', () => {
    expect(buildChronicle([])).toEqual([])
  })
})
