import { APP_URL, commitMessage } from '../vault/github/commitMessage'
import type { GitHubCommit } from '../vault/github/githubApi'
import type { PendingEdit } from '../vault/github/githubSync'

/**
 * A made-up commit history for the sample vault, so its party page has a chronicle to show: two game
 * nights of the sample party, written by the app's own `commitMessage`. The second night ends on the
 * values the sample sheets hold, so a sheet opened from the chronicle agrees with it. Dated relative
 * to now, so the sessions always look recent.
 */

/** A changed field: its key path, before and after. `note` names the file when it isn't the sheet. */
type Change = { key: string; from: number; to: number; note?: string } | { created: string } | { updated: string; note: string }

/** One commit: a character and what changed. */
type Edit = [character: string, changes: Change[]]

const set = (key: string, from: number, to: number, note?: string): Change => ({ key, from, to, note })

/** A game night: how many days ago it started (at 19:30), and its commits a few minutes apart. */
const SESSIONS: { daysAgo: number; edits: Edit[] }[] = [
  {
    daysAgo: 9,
    edits: [
      ['Borin Eisenfaust', [set('resilience.current', 10, 4)]],
      ['Borin Eisenfaust', [set('resilience.current', 4, 0), set('hp.current', 30, 24)]],
      ['Elandra Windrider', [set('spellcasting.mana.current', 12, 9, 'Spell Sheet Elandra')]],
      ['Kaelen Dornwacht', [set('resilience.current', 5, 2)]],
      ['Elandra Windrider', [set('spellcasting.mana.current', 9, 6, 'Spell Sheet Elandra')]],
      ['Ilsa Morgentau', [set('spellcasting.mana.current', 12, 9, 'Spell Sheet Ilsa')]],
      ['Elandra Windrider', [{ created: 'Tagebuch Elandra' }]],
    ],
  },
  {
    daysAgo: 2,
    edits: [
      ['Fenn Flinkfinger', [set('hp.current', 12, 7)]],
      ['Ren Aschenlied', [set('resources.ki', 3, 2)]],
      ['Aldric von Hohenwacht', [set('resilience.current', 15, 9), set('hp.current', 30, 26)]],
      ['Borin Eisenfaust', [set('resilience.current', 10, 5), set('conditions.exhaustion', 0, 1), set('hp.current', 30, 21)]],
      ['Elandra Windrider', [set('resilience.current', 4, 3), set('hp.current', 12, 9)]],
      ['Elandra Windrider', [set('spellcasting.mana.current', 12, 9, 'Spell Sheet Elandra')]],
      ['Ilsa Morgentau', [set('spellcasting.mana.current', 12, 7, 'Spell Sheet Ilsa')]],
      ['Ren Aschenlied', [set('resilience.current', 12, 9), set('hp.current', 18, 14)]],
      ['Kaelen Dornwacht', [set('resilience.current', 5, 3)]],
      ['Elandra Windrider', [{ updated: 'journal', note: 'Tagebuch Elandra' }]],
    ],
  },
]

const notePath = (character: string, note = character) => `Kampagne/Gruppe/${character}/${note}.md`

/** The edits a commit of the app would carry for `edit`. */
function pendingEdits([character, changes]: Edit): PendingEdit[] {
  return changes.map((change): PendingEdit => {
    if ('created' in change) return { character, path: notePath(character, change.created), patch: { kind: 'create', keyPath: [], value: '' }, base: undefined }
    if ('updated' in change) {
      // A whole block (a journal) — too long to spell out, so the message only says it changed.
      const long = 'x'.repeat(80)
      return { character, path: notePath(character, change.note), patch: { kind: 'block', keyPath: [change.updated], value: long }, base: long }
    }
    return { character, path: notePath(character, change.note), patch: { kind: 'field', keyPath: change.key.split('.'), value: change.to }, base: change.from }
  })
}

/** The sample vault's history, newest first like GitHub's. */
export function sampleChronicleCommits(now = new Date()): GitHubCommit[] {
  const commits: GitHubCommit[] = []
  SESSIONS.forEach(({ daysAgo, edits }, s) => {
    const start = new Date(now)
    start.setDate(start.getDate() - daysAgo)
    start.setHours(19, 30, 0, 0)
    edits.forEach((edit, i) => {
      commits.push({
        sha: `sample-${s}-${i}`,
        message: commitMessage(pendingEdits(edit)),
        date: new Date(start.getTime() + i * 12 * 60 * 1000).toISOString(),
        login: null,
        authorName: 'D&D Companion',
        url: APP_URL,
      })
    })
  })
  return commits.sort((a, b) => b.date.localeCompare(a.date))
}
