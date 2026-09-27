/**
 * Minimal GitHub REST client for reading a vault straight out of a repository — no server involved:
 * `api.github.com` answers browser requests (CORS), authenticated with a personal access token the
 * user pasted in. The token is sent nowhere else.
 */

const API = 'https://api.github.com'

/** Which repository (and which folder in it) holds the vault. */
export interface GitHubVaultRef {
  owner: string
  repo: string
  /** Empty: the repository's default branch. */
  branch: string
  /** Folder inside the repository that is the vault root (no leading/trailing slash); empty: the repository root. */
  subpath: string
}

/** Why a request failed, in terms the UI can explain. */
export type GitHubErrorKind =
  | 'unauthorized' // token invalid, expired or revoked (401)
  | 'forbidden' // token valid but lacks permission, e.g. not granted for this repository (403)
  | 'rate-limited'
  | 'repo-not-found' // no such repository — or it is private and the token cannot see it (GitHub answers 404 for both)
  | 'branch-not-found'
  | 'subpath-not-found'
  | 'too-large' // the recursive tree listing was truncated
  | 'write-forbidden' // a write was refused: token is read-only, or the account may not push to the repository
  | 'not-fast-forward' // the branch moved while a commit was being made (internal: the sync retries)
  | 'network'
  | 'other'

export class GitHubError extends Error {
  readonly kind: GitHubErrorKind
  readonly status?: number

  constructor(kind: GitHubErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'GitHubError'
    this.kind = kind
    this.status = status
  }
}

/** A stable identity for a vault source — the same repository/branch/folder opened twice is one recents entry. */
export function gitHubVaultKey(ref: GitHubVaultRef): string {
  return `${ref.owner}/${ref.repo}@${ref.branch}:${ref.subpath}`.toLowerCase()
}

/** The name the start page shows for a GitHub vault: its folder, like a local vault folder would be named. */
export function gitHubVaultName(ref: GitHubVaultRef): string {
  return ref.subpath.split('/').pop() || ref.repo
}

function trimSlashes(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

/**
 * Accepts what users tend to paste: `owner/repo`, a clone URL (`https://github.com/owner/repo.git`) or
 * a browser URL of a branch/folder (`https://github.com/owner/repo/tree/<branch>/<folder>`). A branch
 * and folder found in the URL fill in `branch`/`subpath` when those weren't given separately. Branch
 * names containing `/` are ambiguous in such a URL — the first segment is taken as the branch.
 */
export function parseGitHubVaultRef(repoInput: string, branch = '', subpath = ''): GitHubVaultRef | null {
  let rest = repoInput.trim().replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '').replace(/^git@github\.com:/i, '')
  rest = rest.replace(/[?#].*$/, '')
  const segments = trimSlashes(rest).split('/').filter(Boolean)
  if (segments.length < 2) return null
  const owner = segments[0]
  const repo = segments[1].replace(/\.git$/i, '')
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null

  let urlBranch = ''
  let urlSubpath = ''
  if (segments[2] === 'tree' && segments[3]) {
    urlBranch = decodeURIComponent(segments[3])
    urlSubpath = segments.slice(4).map(decodeURIComponent).join('/')
  }
  return { owner, repo, branch: branch.trim() || urlBranch, subpath: trimSlashes(subpath) || urlSubpath }
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH'
  /** Sent as JSON. */
  body?: unknown
  /** `Accept` header — the raw media type returns a blob's bytes instead of base64 JSON. */
  accept?: string
  /** Revalidate instead of trusting the browser's HTTP cache (GitHub sends `max-age=60`), so a
   * just-pushed change shows up on the next load. Immutable, SHA-addressed objects don't need it. */
  fresh?: boolean
}

async function request(token: string, path: string, options: RequestOptions = {}): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${API}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: options.accept ?? 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: options.fresh || options.method ? 'no-cache' : 'default',
    })
  } catch (err) {
    throw new GitHubError('network', `Could not reach GitHub: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (res.ok) return res

  let detail = res.statusText
  try {
    detail = ((await res.json()) as { message?: string }).message ?? detail
  } catch {
    // Not JSON — keep the status text.
  }
  const message = `GitHub ${res.status} for ${options.method ?? 'GET'} ${path}: ${detail}`
  if (res.status === 401) throw new GitHubError('unauthorized', message, res.status)
  if (res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) {
    throw new GitHubError('rate-limited', message, res.status)
  }
  // A write the token may not make is answered with 403 — or 404, when the repository is only visible to it read-only.
  if (options.method && (res.status === 403 || res.status === 404)) throw new GitHubError('write-forbidden', message, res.status)
  if (options.method === 'PATCH' && res.status === 422) throw new GitHubError('not-fast-forward', message, res.status)
  if (res.status === 403) throw new GitHubError('forbidden', message, res.status)
  if (res.status === 404) throw new GitHubError('repo-not-found', message, res.status)
  throw new GitHubError('other', message, res.status)
}

async function getJson<T>(token: string, path: string, options?: RequestOptions): Promise<T> {
  return (await (await request(token, path, options)).json()) as T
}

export interface GitHubTreeEntry {
  path: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
}

export interface GitHubSnapshot {
  /** The branch actually read (the default branch when none was given). */
  branch: string
  /** Head commit the tree was read from — the base a later write-back commits on top of. */
  commitSha: string
  entries: GitHubTreeEntry[]
}

function repoPath(ref: GitHubVaultRef): string {
  return `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`
}

/** Path of a vault file inside the repository (vault paths are relative to `subpath`). */
export function repoFilePath(ref: GitHubVaultRef, vaultPath: string): string {
  return ref.subpath ? `${ref.subpath}/${vaultPath}` : vaultPath
}

export interface BranchHead {
  commitSha: string
  treeSha: string
}

/** The branch's current head commit (and its tree), bypassing the browser's HTTP cache. */
export async function fetchBranchHead(token: string, ref: GitHubVaultRef, branch: string): Promise<BranchHead> {
  try {
    const head = await getJson<{ commit: { sha: string; commit: { tree: { sha: string } } } }>(
      token,
      `${repoPath(ref)}/branches/${encodePath(branch)}`,
      { fresh: true },
    )
    return { commitSha: head.commit.sha, treeSha: head.commit.commit.tree.sha }
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) {
      throw new GitHubError('branch-not-found', `Branch "${branch}" does not exist in ${ref.owner}/${ref.repo}.`, 404)
    }
    throw err
  }
}

/**
 * Lists every file of the branch in one recursive tree request. Resolves the branch head first
 * (which also tells a missing branch apart from a missing repository — GitHub answers 404 to both).
 */
export async function fetchSnapshot(token: string, ref: GitHubVaultRef): Promise<GitHubSnapshot> {
  const repoInfo = await getJson<{ default_branch: string }>(token, repoPath(ref), { fresh: true })
  const branch = ref.branch || repoInfo.default_branch
  const head = await fetchBranchHead(token, ref, branch)

  const tree = await getJson<{ tree: GitHubTreeEntry[]; truncated: boolean }>(token, `${repoPath(ref)}/git/trees/${head.treeSha}?recursive=1`)
  if (tree.truncated) {
    throw new GitHubError('too-large', `The repository ${ref.owner}/${ref.repo} has too many files to list in one request.`)
  }
  return { branch, commitSha: head.commitSha, entries: tree.tree }
}

/** A blob's raw bytes. Blobs are addressed by content hash, so the browser may cache them freely. */
export async function fetchBlob(token: string, ref: GitHubVaultRef, sha: string): Promise<ArrayBuffer> {
  const res = await request(token, `${repoPath(ref)}/git/blobs/${sha}`, { accept: 'application/vnd.github.raw+json' })
  return res.arrayBuffer()
}

/** A vault note's text as of `commitSha`, or `null` when the file no longer exists there. */
export async function fetchFileAt(token: string, ref: GitHubVaultRef, vaultPath: string, commitSha: string): Promise<string | null> {
  try {
    const res = await request(token, `${repoPath(ref)}/contents/${encodePath(repoFilePath(ref, vaultPath))}?ref=${commitSha}`, {
      accept: 'application/vnd.github.raw+json',
    })
    return await res.text()
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) return null
    throw err
  }
}

/** The GitHub login of the token's account (`GET /user` works with any token). */
export async function fetchLogin(token: string): Promise<string> {
  return (await getJson<{ login: string }>(token, '/user')).login
}

/** Whether the token's account may push to the repository (a read-only *token* only shows on the first write). */
export async function fetchCanPush(token: string, ref: GitHubVaultRef): Promise<boolean> {
  const repo = await getJson<{ permissions?: { push?: boolean } }>(token, repoPath(ref), { fresh: true })
  return repo.permissions?.push === true
}

/**
 * Commits `files` (vault path -> full new text) on top of `parent` as one commit and moves the branch
 * to it — without force, so a branch that moved meanwhile fails with `not-fast-forward` instead of
 * dropping someone else's commit. Returns the new commit's SHA.
 */
export async function commitFiles(
  token: string,
  ref: GitHubVaultRef,
  branch: string,
  parent: BranchHead,
  files: Map<string, string>,
  message: string,
): Promise<string> {
  const tree = await getJson<{ sha: string }>(token, `${repoPath(ref)}/git/trees`, {
    method: 'POST',
    body: {
      base_tree: parent.treeSha,
      tree: [...files].map(([path, content]) => ({ path: repoFilePath(ref, path), mode: '100644', type: 'blob', content })),
    },
  })
  const commit = await getJson<{ sha: string }>(token, `${repoPath(ref)}/git/commits`, {
    method: 'POST',
    body: { message, tree: tree.sha, parents: [parent.commitSha] },
  })
  await request(token, `${repoPath(ref)}/git/refs/heads/${encodePath(branch)}`, { method: 'PATCH', body: { sha: commit.sha, force: false } })
  return commit.sha
}
