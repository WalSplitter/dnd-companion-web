import type { GitHubCommit } from '../../vault/github/githubApi'
import { parseAppCommit } from '../../vault/github/commitHistory'

/** A quiet stretch this long between two commits starts a new session — long enough that a session
 * running past midnight stays one, short enough that two game nights never merge. */
export const SESSION_GAP_MS = 8 * 3600 * 1000

/** What happened to one field over a session: its value before the first change and after the last. */
export type ChronicleChange =
  | { kind: 'set'; key: string; from: string | null; to: string | null; steps: number }
  | { kind: 'updated'; key: string; steps: number }
  | { kind: 'created'; note: string }

export interface ChronicleCharacter {
  name: string
  changes: ChronicleChange[]
  /** GitHub logins that made these edits (from the `Edited-by` trailer). */
  editors: string[]
}

/** Commits not made by the app, per author — shown as "edited by hand". */
export interface ChronicleManualEdit {
  author: string
  count: number
  /** Distinct subject lines, oldest first. */
  subjects: string[]
  /** The newest of these commits on GitHub. */
  url: string
}

export interface ChronicleSession {
  start: Date
  end: Date
  commits: number
  characters: ChronicleCharacter[]
  manual: ChronicleManualEdit[]
}

const firstLine = (message: string) => message.split(/\r?\n/, 1)[0].trim()

function buildSession(commits: GitHubCommit[]): ChronicleSession {
  const characters = new Map<string, { changes: Map<string, ChronicleChange>; editors: Set<string> }>()
  const manual = new Map<string, ChronicleManualEdit>()

  for (const commit of commits) {
    const parsed = parseAppCommit(commit.message)
    if (!parsed) {
      const author = commit.login ?? (commit.authorName || '?')
      const entry = manual.get(author) ?? { author, count: 0, subjects: [], url: commit.url }
      entry.count++
      entry.url = commit.url
      const subject = firstLine(commit.message)
      if (subject && !entry.subjects.includes(subject)) entry.subjects.push(subject)
      manual.set(author, entry)
      continue
    }
    for (const group of parsed.groups) {
      const character = characters.get(group.character) ?? { changes: new Map(), editors: new Set<string>() }
      characters.set(group.character, character)
      const editor = parsed.editedBy ?? commit.login
      if (editor) character.editors.add(editor)
      for (const change of group.changes) {
        if (change.kind === 'created') {
          character.changes.set(`created:${change.note}`, change)
          continue
        }
        const prev = character.changes.get(change.key)
        const steps = prev && prev.kind !== 'created' ? prev.steps + 1 : 1
        if (change.kind === 'set' && (!prev || prev.kind === 'set')) {
          // Net change: where the value started this session, where it ended.
          character.changes.set(change.key, { kind: 'set', key: change.key, from: prev ? prev.from : change.from, to: change.to, steps })
        } else {
          character.changes.set(change.key, { kind: 'updated', key: change.key, steps })
        }
      }
    }
  }

  return {
    start: new Date(commits[0].date),
    end: new Date(commits[commits.length - 1].date),
    commits: commits.length,
    characters: [...characters].map(([name, c]) => ({ name, changes: [...c.changes.values()], editors: [...c.editors] })),
    manual: [...manual.values()],
  }
}

/**
 * The vault's history as play sessions, newest first: commits (in any order) split wherever
 * `SESSION_GAP_MS` passed without one, each session summarizing per character what changed in it.
 */
export function buildChronicle(commits: GitHubCommit[]): ChronicleSession[] {
  const sorted = commits.filter((c) => !Number.isNaN(Date.parse(c.date))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  const sessions: GitHubCommit[][] = []
  let last = -Infinity
  for (const commit of sorted) {
    const time = Date.parse(commit.date)
    if (time - last >= SESSION_GAP_MS) sessions.push([])
    sessions[sessions.length - 1].push(commit)
    last = time
  }
  return sessions.map(buildSession).reverse()
}
