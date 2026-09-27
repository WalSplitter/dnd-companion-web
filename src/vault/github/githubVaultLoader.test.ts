import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryBlobCache } from './blobCache'
import { GitHubError, parseGitHubVaultRef, type GitHubVaultRef } from './githubApi'
import { readVaultFromGitHub } from './githubVaultLoader'

const encoder = new TextEncoder()

/** Blob SHA -> content; the fake repository's files point at these. */
const BLOBS: Record<string, string> = {
  sha_char: '---\nname: Brünhild\n---\nKriegerin',
  sha_item: '---\nname: Seil\n---\n',
  sha_img: '<svg xmlns="http://www.w3.org/2000/svg"/>',
  sha_obsidian: '{}',
  sha_readme: '# Readme',
}

const TREE = [
  { path: 'README.md', type: 'blob', sha: 'sha_readme' },
  { path: 'Vault', type: 'tree', sha: 't1' },
  { path: 'Vault/.obsidian/workspace.md', type: 'blob', sha: 'sha_obsidian' },
  { path: 'Vault/Kampagne/Brünhild.md', type: 'blob', sha: 'sha_char' },
  { path: 'Vault/Gegenstände/Seil.md', type: 'blob', sha: 'sha_item' },
  { path: 'Vault/Bilder/Portrait.SVG', type: 'blob', sha: 'sha_img' },
  { path: 'Vault/Bilder/notes.pdf', type: 'blob', sha: 'sha_pdf' },
]

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

/** A tiny stand-in for api.github.com serving one repository `me/vault` with branches `main` (default) and `test`. */
function fakeGitHub(options: { truncated?: boolean } = {}) {
  const requests: string[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    requests.push(url)
    if (new Headers(init?.headers).get('Authorization') !== 'Bearer good-token') return json({ message: 'Bad credentials' }, 401)

    const path = url.replace('https://api.github.com', '')
    if (path === '/repos/me/vault') return json({ default_branch: 'main' })
    const branch = path.match(/^\/repos\/me\/vault\/branches\/(.+)$/)
    if (branch) {
      if (!['main', 'test'].includes(branch[1])) return json({ message: 'Branch not found' }, 404)
      return json({ commit: { sha: `commit_${branch[1]}`, commit: { tree: { sha: 'tree_root' } } } })
    }
    if (path === '/repos/me/vault/git/trees/tree_root?recursive=1') return json({ tree: TREE, truncated: options.truncated ?? false })
    const blob = path.match(/^\/repos\/me\/vault\/git\/blobs\/(\w+)$/)
    if (blob && BLOBS[blob[1]] !== undefined) return new Response(encoder.encode(BLOBS[blob[1]]))
    return json({ message: 'Not Found' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { requests, blobRequests: () => requests.filter((r) => r.includes('/git/blobs/')) }
}

const ref = (overrides: Partial<GitHubVaultRef> = {}): GitHubVaultRef => ({ owner: 'me', repo: 'vault', branch: '', subpath: 'Vault', ...overrides })

async function failureOf(promise: Promise<unknown>): Promise<GitHubError> {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(err).toBeInstanceOf(GitHubError)
  return err as GitHubError
}

beforeEach(() => {
  let n = 0
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => `blob:fake/${++n}`) }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseGitHubVaultRef', () => {
  it('accepts owner/repo, clone URLs and SSH remotes', () => {
    expect(parseGitHubVaultRef('me/vault')).toEqual({ owner: 'me', repo: 'vault', branch: '', subpath: '' })
    expect(parseGitHubVaultRef(' https://github.com/WalSplitter/endeavour-vault-test.git ')).toMatchObject({ owner: 'WalSplitter', repo: 'endeavour-vault-test' })
    expect(parseGitHubVaultRef('git@github.com:me/vault.git')).toMatchObject({ owner: 'me', repo: 'vault' })
  })

  it('takes branch and folder from a pasted tree URL, unless given separately', () => {
    const url = 'https://github.com/me/vault/tree/test/Endeavour_PlayerVault/01%20-%20Spielerbereich'
    expect(parseGitHubVaultRef(url)).toEqual({ owner: 'me', repo: 'vault', branch: 'test', subpath: 'Endeavour_PlayerVault/01 - Spielerbereich' })
    expect(parseGitHubVaultRef(url, 'main', '/Other/')).toMatchObject({ branch: 'main', subpath: 'Other' })
  })

  it('rejects input that names no repository', () => {
    expect(parseGitHubVaultRef('vault')).toBeNull()
    expect(parseGitHubVaultRef('https://github.com/me')).toBeNull()
    expect(parseGitHubVaultRef('me/va ult')).toBeNull()
  })
})

describe('readVaultFromGitHub', () => {
  it('reads the notes and images below the vault folder, like a local folder load', async () => {
    fakeGitHub()
    const progress: [number, number][] = []
    const result = await readVaultFromGitHub('good-token', ref(), { onProgress: (done, total) => progress.push([done, total]) })

    expect(result.files).toEqual(
      expect.arrayContaining([
        { path: 'Kampagne/Brünhild.md', content: BLOBS.sha_char },
        { path: 'Gegenstände/Seil.md', content: BLOBS.sha_item },
      ]),
    )
    // Outside the folder (README), dot-folders (.obsidian) and other file types are skipped.
    expect(result.files).toHaveLength(2)
    expect([...result.imageAssets.keys()]).toEqual(['portrait.svg'])
    expect(result.snapshot).toMatchObject({ branch: 'main', commitSha: 'commit_main' })
    expect(progress.at(-1)).toEqual([3, 3])
  })

  it('gives image blobs their MIME type, so an SVG object URL renders in an <img>', async () => {
    fakeGitHub()
    await readVaultFromGitHub('good-token', ref())
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob
    expect(blob.type).toBe('image/svg+xml')
  })

  it('reads an explicitly named branch', async () => {
    const { requests } = fakeGitHub()
    const result = await readVaultFromGitHub('good-token', ref({ branch: 'test' }))
    expect(result.snapshot.branch).toBe('test')
    expect(requests).toContain('https://api.github.com/repos/me/vault/branches/test')
  })

  it('downloads only blobs missing from the cache, and prunes blobs no longer in the vault', async () => {
    const { blobRequests } = fakeGitHub()
    const cache = memoryBlobCache([['sha_char', encoder.encode(BLOBS.sha_char).buffer as ArrayBuffer], ['sha_gone', new ArrayBuffer(1)]])

    const result = await readVaultFromGitHub('good-token', ref(), { cache })

    expect(result.files.find((f) => f.path === 'Kampagne/Brünhild.md')?.content).toBe(BLOBS.sha_char)
    expect(blobRequests()).toHaveLength(2)
    expect([...cache.entries.keys()].sort()).toEqual(['sha_char', 'sha_img', 'sha_item'])

    await readVaultFromGitHub('good-token', ref(), { cache })
    expect(blobRequests()).toHaveLength(2)
  })

  it('explains each way the repository can be out of reach', async () => {
    fakeGitHub()
    expect((await failureOf(readVaultFromGitHub('expired', ref()))).kind).toBe('unauthorized')
    expect((await failureOf(readVaultFromGitHub('good-token', ref({ repo: 'other' })))).kind).toBe('repo-not-found')
    expect((await failureOf(readVaultFromGitHub('good-token', ref({ branch: 'nope' })))).kind).toBe('branch-not-found')
    expect((await failureOf(readVaultFromGitHub('good-token', ref({ subpath: 'Missing' })))).kind).toBe('subpath-not-found')
  })

  it('refuses a truncated tree rather than showing a partial vault', async () => {
    fakeGitHub({ truncated: true })
    expect((await failureOf(readVaultFromGitHub('good-token', ref()))).kind).toBe('too-large')
  })

  it('tells a rate limit apart from missing permissions, and a dead connection from both', async () => {
    const respond = (response: Response) => vi.stubGlobal('fetch', vi.fn(async () => response))
    respond(json({ message: 'API rate limit exceeded' }, 403, { 'x-ratelimit-remaining': '0' }))
    expect((await failureOf(readVaultFromGitHub('t', ref()))).kind).toBe('rate-limited')
    respond(json({ message: 'Resource not accessible by personal access token' }, 403))
    expect((await failureOf(readVaultFromGitHub('t', ref()))).kind).toBe('forbidden')

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    expect((await failureOf(readVaultFromGitHub('t', ref()))).kind).toBe('network')
  })
})
