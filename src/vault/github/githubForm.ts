import type { GitHubVaultRef } from './githubApi'

/** The "open from GitHub" form's fields, as typed. */
export interface GitHubFormValues {
  repo: string
  branch: string
  subpath: string
  token: string
}

export const EMPTY_GITHUB_FORM: GitHubFormValues = { repo: '', branch: '', subpath: '', token: '' }

/** Form values that reopen `ref` — for retrying a GitHub vault whose load failed. */
export function gitHubFormValues(ref: GitHubVaultRef, token: string): GitHubFormValues {
  return { repo: `${ref.owner}/${ref.repo}`, branch: ref.branch, subpath: ref.subpath, token }
}
