import { afterEach, describe, expect, it, vi } from 'vitest'
import { fieldPatch } from '../writeback/persist'
import type { GitHubVaultRef } from './githubApi'
import { GitHubSync, sameValue, type PendingEdit, type SyncStatus } from './githubSync'

const REF: GitHubVaultRef = { owner: 'me', repo: 'vault', branch: 'main', subpath: 'Vault' }

const note = (hp: number, mana = 3) => `---\nname: Brünhild\nhp:\n  current: ${hp}\nmana: ${mana}\n---\nBody text.\n`
const hpTarget = { path: 'Brünhild.md', keyPath: ['hp', 'current'] }
const manaTarget = { path: 'Brünhild.md', keyPath: ['mana'] }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/**
 * A GitHub repository in memory, with real commit history: `main` points at a commit, each commit maps
 * repository paths to file text. Serves exactly the endpoints the sync uses.
 */
function fakeRepo(files: Record<string, string>) {
  const commits = new Map<string, { parent: string | null; files: Map<string, string>; message: string }>([
    ['c0', { parent: null, files: new Map(Object.entries(files)), message: 'initial' }],
  ])
  const trees = new Map<string, Map<string, string>>()
  let head = 'c0'
  let n = 0
  const repo = {
    /** Called right before the branch is moved — lets a test slip a teammate's push in. */
    beforeRefUpdate: null as (() => void) | null,
    writesForbidden: false,
    get head() {
      return head
    },
    fileAt: (path: string, commit = head) => commits.get(commit)!.files.get(path),
    /** Commits made through the API, oldest first (the teammate's pushes excluded). */
    appCommits: [] as { message: string; files: Map<string, string> }[],
    /** A teammate pushes a change straight to `main`. */
    push(path: string, content: string) {
      const next = new Map(commits.get(head)!.files).set(path, content)
      const sha = `c${++n}`
      commits.set(sha, { parent: head, files: next, message: 'teammate' })
      head = sha
    },
  }

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input))
      const path = decodeURIComponent(url.pathname)
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : undefined

      if (path === '/repos/me/vault/branches/main') return json({ commit: { sha: head, commit: { tree: { sha: `tree:${head}` } } } })
      if (path === '/repos/me/vault') return json({ permissions: { push: true } })
      if (path === '/user') return json({ login: 'tester' })
      if (path.startsWith('/repos/me/vault/contents/')) {
        const content = commits.get(url.searchParams.get('ref')!)?.files.get(path.slice('/repos/me/vault/contents/'.length))
        return content === undefined ? json({ message: 'Not Found' }, 404) : new Response(content)
      }
      if (repo.writesForbidden && method !== 'GET') return json({ message: 'Resource not accessible by personal access token' }, 403)
      if (method === 'POST' && path === '/repos/me/vault/git/trees') {
        const base = commits.get(body.base_tree.replace('tree:', ''))!.files
        const tree = new Map(base)
        for (const entry of body.tree) tree.set(entry.path, entry.content)
        const sha = `t${++n}`
        trees.set(sha, tree)
        return json({ sha })
      }
      if (method === 'POST' && path === '/repos/me/vault/git/commits') {
        const sha = `c${++n}`
        commits.set(sha, { parent: body.parents[0], files: trees.get(body.tree)!, message: body.message })
        return json({ sha })
      }
      if (method === 'PATCH' && path === '/repos/me/vault/git/refs/heads/main') {
        repo.beforeRefUpdate?.()
        repo.beforeRefUpdate = null
        const commit = commits.get(body.sha)!
        if (commit.parent !== head) return json({ message: 'Update is not a fast forward' }, 422)
        head = body.sha
        repo.appCommits.push({ message: commit.message, files: commit.files })
        return json({ object: { sha: head } })
      }
      return json({ message: `unexpected ${method} ${path}` }, 500)
    }),
  )
  return repo
}

function makeSync(options: { contents?: Record<string, string>; restored?: PendingEdit[] } = {}) {
  const contents = options.contents ?? { 'Brünhild.md': note(12) }
  const persisted: PendingEdit[][] = []
  const statuses: SyncStatus[] = []
  const sync = new GitHubSync({
    token: 't',
    ref: REF,
    commitSha: 'c0',
    contents: new Map(Object.entries(contents)),
    restored: options.restored,
    persist: async (edits) => void persisted.push(structuredClone(edits)),
    onStatus: (status) => statuses.push(status),
  })
  return { sync, persisted, statuses }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('sameValue', () => {
  it('compares YAML-ish values by content, ignoring key order and undefined properties', () => {
    expect(sameValue({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true)
    expect(sameValue({ cp: 1, gp: undefined }, { cp: 1 })).toBe(true)
    expect(sameValue([1, 2], [2, 1])).toBe(false)
    expect(sameValue(1, '1')).toBe(false)
  })
})

describe('GitHubSync', () => {
  it('bundles several edits into one commit and empties the queue', async () => {
    const repo = fakeRepo({ 'Vault/Brünhild.md': note(12) })
    const { sync, persisted } = makeSync()

    const context = { character: 'Brünhild die Kühne' }
    await sync.write('Brünhild.md', fieldPatch(hpTarget, 11), context)
    await sync.write('Brünhild.md', fieldPatch(hpTarget, 9), context)
    await sync.write('Brünhild.md', fieldPatch(manaTarget, 1), context)
    expect(sync.pendingCount).toBe(2) // one entry per key, however often it was clicked
    await sync.flush()

    expect(repo.appCommits).toHaveLength(1)
    expect(repo.fileAt('Vault/Brünhild.md')).toBe(note(9, 1))
    expect(repo.appCommits[0].message).toBe(
      [
        'chore(brünhild-die-kühne): update hp and mana',
        'Brünhild die Kühne:\n- hp.current: 12 → 9\n- mana: 3 → 1',
        'Edited-by: @tester\nVia: D&D Companion <https://github.com/WalSplitter/dnd-companion-web>',
      ].join('\n\n'),
    )
    expect(sync.status).toEqual({ state: 'synced' })
    expect(persisted.at(-1)).toEqual([])
  })

  it('commits after a quiet period, not on every click', async () => {
    vi.useFakeTimers()
    const repo = fakeRepo({ 'Vault/Brünhild.md': note(12) })
    const { sync } = makeSync()

    await sync.write('Brünhild.md', fieldPatch(hpTarget, 11))
    await vi.advanceTimersByTimeAsync(3 * 60_000)
    await sync.write('Brünhild.md', fieldPatch(hpTarget, 10))
    await vi.advanceTimersByTimeAsync(3 * 60_000)
    expect(repo.appCommits).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(2 * 60_000 + 1_000)
    expect(repo.appCommits).toHaveLength(1)
    expect(repo.fileAt('Vault/Brünhild.md')).toBe(note(10))
  })

  it('has nothing to commit when a value is changed back', async () => {
    const repo = fakeRepo({ 'Vault/Brünhild.md': note(12) })
    const { sync } = makeSync()
    await sync.write('Brünhild.md', fieldPatch(hpTarget, 11))
    await sync.write('Brünhild.md', fieldPatch(hpTarget, 12))
    expect(sync.pendingCount).toBe(0)
    await sync.flush()
    expect(repo.appCommits).toHaveLength(0)
  })

  it("keeps a teammate's change to another key of the same note", async () => {
    const repo = fakeRepo({ 'Vault/Brünhild.md': note(12) })
    const { sync } = makeSync()
    repo.push('Vault/Brünhild.md', note(12, 5)) // mana 3 → 5, pushed after we loaded

    await sync.write('Brünhild.md', fieldPatch(hpTarget, 8))
    await sync.flush()

    expect(repo.fileAt('Vault/Brünhild.md')).toBe(note(8, 5))
    expect(sync.status.state).toBe('synced')
  })

  it('stops with a conflict when the same key changed on both sides, and never overwrites silently', async () => {
    const repo = fakeRepo({ 'Vault/Brünhild.md': note(12) })
    const { sync } = makeSync()
    repo.push('Vault/Brünhild.md', note(4)) // the DM set HP to 4

    await sync.write('Brünhild.md', fieldPatch(hpTarget, 8))
    await sync.flush()

    expect(repo.appCommits).toHaveLength(0)
    expect(sync.status).toMatchObject({
      state: 'conflict',
      conflicts: [{ path: 'Brünhild.md', keyPath: ['hp', 'current'], base: 12, theirs: 4, mine: 8 }],
    })

    await sync.resolveConflicts('mine')
    expect(repo.fileAt('Vault/Brünhild.md')).toBe(note(8))
    expect(sync.status.state).toBe('synced')
  })

  it("drops the conflicting edits when the repository's values are chosen", async () => {
    const repo = fakeRepo({ 'Vault/Brünhild.md': note(12) })
    const { sync } = makeSync()
    repo.push('Vault/Brünhild.md', note(4))
    await sync.write('Brünhild.md', fieldPatch(hpTarget, 8))
    await sync.flush()

    await sync.resolveConflicts('theirs')
    expect(sync.pendingCount).toBe(0)
    expect(repo.appCommits).toHaveLength(0)
    expect(repo.fileAt('Vault/Brünhild.md')).toBe(note(4))
  })

  it('rebuilds the commit when someone pushes between reading the head and moving the branch', async () => {
    const repo = fakeRepo({ 'Vault/Brünhild.md': note(12), 'Vault/Other.md': '---\nname: Other\nhp: 1\n---\n' })
    const { sync } = makeSync()
    repo.beforeRefUpdate = () => repo.push('Vault/Other.md', '---\nname: Other\nhp: 2\n---\n')

    await sync.write('Brünhild.md', fieldPatch(hpTarget, 7))
    await sync.flush()

    expect(repo.fileAt('Vault/Brünhild.md')).toBe(note(7))
    expect(repo.fileAt('Vault/Other.md')).toContain('hp: 2') // the racing push survived
    expect(sync.status.state).toBe('synced')
  })

  it('keeps edits made while a commit is under way, without a false conflict afterwards', async () => {
    const repo = fakeRepo({ 'Vault/Brünhild.md': note(12) })
    const { sync } = makeSync()
    await sync.write('Brünhild.md', fieldPatch(hpTarget, 11))
    repo.beforeRefUpdate = () => void sync.write('Brünhild.md', fieldPatch(hpTarget, 10))
    await sync.flush()
    expect(repo.fileAt('Vault/Brünhild.md')).toBe(note(11))
    expect(sync.pendingCount).toBe(1)

    await sync.flush()
    expect(repo.fileAt('Vault/Brünhild.md')).toBe(note(10))
    expect(sync.status.state).toBe('synced')
  })

  it('re-applies edits kept from an earlier visit and commits them on start', async () => {
    const repo = fakeRepo({ 'Vault/Brünhild.md': note(12) })
    const restored: PendingEdit[] = [{ path: 'Brünhild.md', patch: fieldPatch(hpTarget, 6), base: 12 }]
    const { sync } = makeSync({ restored })
    expect(sync.localContent('Brünhild.md')).toBe(note(6))

    sync.start()
    await sync.flush()
    sync.dispose()
    expect(repo.fileAt('Vault/Brünhild.md')).toBe(note(6))
  })

  it('refuses an edit the note has no place for, so the store can roll it back', async () => {
    fakeRepo({ 'Vault/Brünhild.md': note(12) })
    const { sync } = makeSync()
    await expect(sync.write('Brünhild.md', fieldPatch({ path: 'Brünhild.md', keyPath: ['missing'] }, 1))).rejects.toThrow('key path not found')
    await expect(sync.write('Nope.md', fieldPatch(hpTarget, 1))).rejects.toThrow()
    expect(sync.pendingCount).toBe(0)
  })

  it('keeps the queue and reports why when GitHub refuses the write', async () => {
    const repo = fakeRepo({ 'Vault/Brünhild.md': note(12) })
    repo.writesForbidden = true
    const { sync } = makeSync()
    await sync.write('Brünhild.md', fieldPatch(hpTarget, 5))
    await sync.flush()

    expect(sync.status).toMatchObject({ state: 'error', kind: 'write-forbidden', count: 1 })
    repo.writesForbidden = false
    await sync.flush()
    expect(repo.fileAt('Vault/Brünhild.md')).toBe(note(5))
  })
})
