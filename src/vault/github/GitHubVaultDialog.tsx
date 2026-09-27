import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Combobox, type ComboboxOption } from '../../components/Combobox'
import { useT } from '../../i18n/useI18n'
import {
  fetchLogin,
  GitHubError,
  listBranches,
  listRepos,
  listVaultFolders,
  parseGitHubVaultRef,
  type GitHubErrorKind,
  type GitHubRepoSummary,
  type GitHubVaultRef,
} from './githubApi'
import { listRecentVaults } from '../handleStore'
import type { GitHubFormValues } from './githubForm'

/** Token names must be unique per account — the date keeps a second token from clashing with the first. */
function tokenName(): string {
  return `D&D Companion ${new Date().toISOString().slice(0, 10)}`
}

/** GitHub's "new fine-grained token" page with name, permission and expiry filled in — only the repository is left to pick. */
function newTokenUrl(description: string): string {
  const params = new URLSearchParams({ name: tokenName(), description, expires_in: '90', contents: 'write' })
  return `https://github.com/settings/personal-access-tokens/new?${params}`
}

/** GitHub's "new classic token" page with the `repo` scope ticked. */
function newClassicTokenUrl(): string {
  return `https://github.com/settings/tokens/new?${new URLSearchParams({ scopes: 'repo', description: tokenName() })}`
}

/** Plain text masked by CSS where the browser can, so no password manager pops up; a password field elsewhere. */
const CAN_MASK = typeof CSS !== 'undefined' && CSS.supports('-webkit-text-security', 'disc')

/** Tokens of the GitHub vaults this browser remembers, to reuse for another repository. Each shows its
 * vault and the token's last characters — never the token itself. */
function useSavedTokens(): ComboboxOption[] {
  const [saved, setSaved] = useState<ComboboxOption[]>([])
  useEffect(() => {
    let cancelled = false
    listRecentVaults().then(
      (recents) => {
        if (cancelled) return
        const byToken = new Map<string, ComboboxOption>()
        for (const r of recents) {
          if (r.kind !== 'github' || byToken.has(r.token)) continue
          byToken.set(r.token, { value: r.token, label: `${r.name} · ${r.github.owner}/${r.github.repo}`, badge: `…${r.token.slice(-4)}` })
        }
        setSaved([...byToken.values()])
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [])
  return saved
}

const ICON = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg {...ICON} className="size-4">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="m3 3 18 18" />}
    </svg>
  )
}

function PasteIcon() {
  return (
    <svg {...ICON} className="size-4">
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
    </svg>
  )
}

const FIELD_BUTTON =
  'flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-trim/28 bg-surface-2 px-2.5 text-xs font-medium text-fg-muted transition hover:border-trim/60 hover:text-trim'

function Field({ id, label, action, hint, children }: { id: string; label: string; action?: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-[0.14em] text-fg-muted">
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint && <p className="mt-1 text-[0.7rem] leading-relaxed text-fg-muted/80">{hint}</p>}
    </div>
  )
}

/** Wait this long after the last keystroke before asking GitHub, so typing doesn't fire a request per key. */
const LOOKUP_DELAY_MS = 450

type TokenCheck =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'ok'; login: string; repos: GitHubRepoSummary[] }
  | { state: 'rejected' }
  | { state: 'failed' }

/** Runs `load` once `key` has held still for a moment; `null` while there is nothing to load or it failed. */
function useDebouncedLookup<T>(key: string | null, load: () => Promise<T>): T | null {
  const [result, setResult] = useState<{ key: string; value: T } | null>(null)
  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    if (key === null) return
    let cancelled = false
    const timer = setTimeout(() => {
      loadRef.current().then(
        (value) => !cancelled && setResult({ key, value }),
        () => !cancelled && setResult(null),
      )
    }, LOOKUP_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key])
  return result && result.key === key ? result.value : null
}

/**
 * Checks the token as soon as it is typed or pasted and, once GitHub accepts it, offers the
 * repositories it reaches, then the chosen repository's branches and likely vault folders — all as
 * suggestions; every field still takes free text.
 */
function useGitHubSuggestions(values: GitHubFormValues) {
  const token = values.token.trim()
  const [check, setCheck] = useState<TokenCheck>({ state: 'idle' })

  useEffect(() => {
    if (token.length < 20) return setCheck({ state: 'idle' })
    let cancelled = false
    setCheck({ state: 'checking' })
    const timer = setTimeout(() => {
      Promise.all([fetchLogin(token), listRepos(token)]).then(
        ([login, repos]) => !cancelled && setCheck({ state: 'ok', login, repos }),
        (err) => !cancelled && setCheck({ state: err instanceof GitHubError && err.kind === 'unauthorized' ? 'rejected' : 'failed' }),
      )
    }, LOOKUP_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [token])

  const ok = check.state === 'ok'
  const ref = ok ? parseGitHubVaultRef(values.repo) : null
  const repoKey = ref ? `${ref.owner}/${ref.repo}` : null
  const branch = values.branch.trim()
  const branches = useDebouncedLookup(repoKey, () => listBranches(token, ref!))
  const folders = useDebouncedLookup(repoKey && `${repoKey}@${branch}`, () => listVaultFolders(token, ref!, branch))
  const defaultBranch = ok && repoKey ? check.repos.find((r) => r.fullName.toLowerCase() === repoKey.toLowerCase())?.defaultBranch : undefined

  return { check, repos: ok ? check.repos : [], branches: branches ?? [], folders: folders ?? [], defaultBranch }
}

function TokenStatus({ check }: { check: TokenCheck }) {
  const t = useT()
  if (check.state === 'idle') return null
  const [text, tone] =
    check.state === 'checking'
      ? [t('github.tokenChecking'), 'text-fg-muted']
      : check.state === 'ok'
        ? [`✓ ${t('github.tokenOk', { login: check.login, n: check.repos.length })}`, 'text-success']
        : check.state === 'rejected'
          ? [t('github.tokenRejected'), 'text-danger']
          : [t('github.tokenCheckFailed'), 'text-warning']
  return (
    <p role="status" className={`mt-1.5 text-xs font-medium ${tone}`}>
      {text}
    </p>
  )
}

/** One setting to pick on GitHub's "new token" page: GitHub's own name for it, and what to choose. */
function TokenStep({ n, setting, choice }: { n: number; setting: string; choice: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-trim/40 text-[0.6rem] font-bold text-trim">{n}</span>
      <span>
        <span className="font-semibold text-fg/90">{setting}</span> <span className="text-fg-muted">→ {choice}</span>
      </span>
    </li>
  )
}

/** A collapsed row of the token guide: one situation, and how to set up a token for it. */
function TokenCase({ summary, intro, children }: { summary: string; intro: ReactNode; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer select-none list-none items-center gap-1.5 px-3 py-1.5 text-fg-muted transition hover:text-fg [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3 shrink-0 transition-transform group-open:rotate-90">
          <path d="m9 6 6 6-6 6" />
        </svg>
        {summary}
      </summary>
      <div className="space-y-2 px-3 pt-0.5 pb-2.5">
        <p className="text-fg-muted">{intro}</p>
        <ol className="space-y-1">{children}</ol>
      </div>
    </details>
  )
}

/**
 * How to make a suitable token — one collapsed row for a repository of your own (fine-grained token)
 * and one for someone else's (classic token, as fine-grained ones can't write there). Gone once a
 * token checks out.
 */
function TokenGuide() {
  const t = useT()
  const link = (href: string) => (
    <a href={href} target="_blank" rel="noreferrer" className="whitespace-nowrap text-trim underline-offset-2 hover:underline">
      {t('github.tokenCreate')} ↗
    </a>
  )
  return (
    <div className="mt-6 divide-y divide-trim/15 rounded-md border border-trim/20 bg-trim/5 text-[0.7rem] leading-relaxed">
      <TokenCase summary={t('github.tokenOwnSummary')} intro={<>{t('github.tokenOwnIntro')} {link(newTokenUrl(t('github.tokenDescription')))}</>}>
        <TokenStep n={1} setting="Repository access" choice={t('github.tokenOwnRepo')} />
        <TokenStep n={2} setting="Permissions · Contents" choice={t('github.tokenOwnPermission')} />
        <TokenStep n={3} setting="Expiration" choice={t('github.tokenOwnExpiry')} />
      </TokenCase>
      <TokenCase summary={t('github.tokenOtherSummary')} intro={<>{t('github.tokenOtherIntro')} {link(newClassicTokenUrl())}</>}>
        <TokenStep n={1} setting="Select scopes" choice={t('github.tokenOtherScope')} />
        <TokenStep n={2} setting="Expiration" choice={t('github.tokenOtherExpiry')} />
      </TokenCase>
    </div>
  )
}

/**
 * Modal form for opening a vault out of a GitHub repository: repository (`owner/repo` or a pasted
 * URL), optional branch and vault folder, and a personal access token. The token comes first: once
 * it checks out, the other fields suggest what it can reach. `error` is why the previous
 * attempt with these values failed. Submitting hands the parsed repository and token to `onSubmit` —
 * loading happens outside, behind the regular loading screen.
 */
export function GitHubVaultDialog({
  initial,
  error,
  onCancel,
  onSubmit,
}: {
  initial: GitHubFormValues
  error: GitHubErrorKind | null
  onCancel: () => void
  onSubmit: (ref: GitHubVaultRef, token: string) => void
}) {
  const t = useT()
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [values, setValues] = useState(initial)
  const [formError, setFormError] = useState<string | null>(null)
  const suggestions = useGitHubSuggestions(values)
  const savedTokens = useSavedTokens()
  const [showToken, setShowToken] = useState(false)
  const [pasteFailed, setPasteFailed] = useState(false)
  const tokenInputRef = useRef<HTMLInputElement>(null)
  const canPaste = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function'

  async function pasteToken() {
    setPasteFailed(false)
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (text) setValue('token')(text)
    } catch {
      // Refused (or nothing readable) — the field is focused, so the usual paste gesture is one step away.
      setPasteFailed(true)
      tokenInputRef.current?.focus()
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const setValue = (key: keyof GitHubFormValues) => (value: string) => setValues((v) => ({ ...v, [key]: value }))

  // A pasted URL (`…/tree/<branch>/<folder>` fills in the branch and folder fields too) is cut down to
  // owner/repo straight away, so the suggestions for that repository can load.
  function setRepo(input: string) {
    const ref = /github\.com[/:]/i.test(input) ? parseGitHubVaultRef(input) : null
    if (!ref) return setValue('repo')(input)
    setValues((v) => ({ repo: `${ref.owner}/${ref.repo}`, branch: v.branch || ref.branch, subpath: v.subpath || ref.subpath, token: v.token }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const ref = parseGitHubVaultRef(values.repo, values.branch, values.subpath)
    if (!ref) return setFormError(t('github.repoInvalid'))
    const token = values.token.trim()
    if (!token) return setFormError(t('github.tokenMissing'))
    onSubmit(ref, token)
  }

  const shownError = formError ?? (error ? t(`github.error.${error}`) : null)

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      className="github-dialog rpg-panel m-auto w-[min(32rem,calc(100vw-2rem))] bg-surface p-0 text-fg"
    >
      <form onSubmit={submit} className="space-y-6 p-5">
        <h2 id={`${id}-title`} className="font-display text-xl font-bold tracking-wide text-fg">
          {t('github.dialogTitle')}
        </h2>

        <Field
          id={`${id}-token`}
          label={t('github.tokenLabel')}
          action={
            <a href={newTokenUrl(t('github.tokenDescription'))} target="_blank" rel="noreferrer" className="whitespace-nowrap text-xs text-trim underline-offset-2 hover:underline">
              {t('github.tokenCreate')} ↗
            </a>
          }
        >
          <div className="flex items-stretch gap-2">
            <div className="min-w-0 flex-1">
              <Combobox
                ref={tokenInputRef}
                id={`${id}-token`}
                className={`font-mono ${CAN_MASK && !showToken ? 'text-masked' : ''}`}
                type={CAN_MASK || showToken ? 'text' : 'password'}
                value={values.token}
                onChange={(token) => {
                  setPasteFailed(false)
                  setValue('token')(token)
                }}
                options={savedTokens}
                placeholder={t('github.tokenPlaceholder')}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
                autoFocus={!initial.token}
                // Keep password-manager extensions from offering to fill or save it.
                data-1p-ignore=""
                data-lpignore="true"
                data-bwignore=""
                data-form-type="other"
              />
            </div>
            {canPaste && (
              <button type="button" onClick={() => void pasteToken()} className={FIELD_BUTTON} title={t('github.tokenPaste')}>
                <PasteIcon />
                <span>{t('github.tokenPaste')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className={FIELD_BUTTON}
              aria-pressed={showToken}
              aria-label={t(showToken ? 'github.tokenHide' : 'github.tokenShow')}
              title={t(showToken ? 'github.tokenHide' : 'github.tokenShow')}
            >
              <EyeIcon crossed={showToken} />
            </button>
          </div>
          {pasteFailed && <p className="mt-1.5 text-xs text-warning">{t('github.tokenPasteFailed')}</p>}
          <TokenStatus check={suggestions.check} />
          {suggestions.check.state !== 'ok' && <TokenGuide />}
        </Field>

        <Field id={`${id}-repo`} label={t('github.repoLabel')}>
          <Combobox
            id={`${id}-repo`}
            value={values.repo}
            onChange={setRepo}
            options={suggestions.repos.map((r) => ({ value: r.fullName }))}
            placeholder={t(suggestions.repos.length > 0 ? 'github.repoPlaceholderPick' : 'github.repoPlaceholder')}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            required
            autoFocus={!!initial.token}
          />
        </Field>

        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <Field id={`${id}-branch`} label={t('github.branchLabel')}>
            <Combobox
              id={`${id}-branch`}
              value={values.branch}
              onChange={setValue('branch')}
              options={suggestions.branches.map((b) => ({ value: b, badge: b === suggestions.defaultBranch ? t('github.branchDefaultBadge') : undefined }))}
              placeholder={
                suggestions.defaultBranch ? t('github.branchPlaceholderNamed', { name: suggestions.defaultBranch }) : t('github.branchPlaceholder')
              }
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>
          <Field id={`${id}-subpath`} label={t('github.subpathLabel')} hint={t('github.subpathHint')}>
            <Combobox
              id={`${id}-subpath`}
              value={values.subpath}
              onChange={setValue('subpath')}
              options={suggestions.folders.map((f) => ({ value: f.path, badge: f.isVault ? t('github.folderVaultBadge') : undefined }))}
              placeholder={t('github.subpathPlaceholder')}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>
        </div>

        <p className="rounded-md border border-trim/25 bg-trim/5 px-3 py-2 text-[0.7rem] leading-relaxed text-fg-muted">{t('github.privacy')}</p>

        {shownError && (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {shownError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg">
            {t('github.cancel')}
          </button>
          <button type="submit" className="rpg-button">
            {t('github.open')}
          </button>
        </div>
      </form>
    </dialog>
  )
}
