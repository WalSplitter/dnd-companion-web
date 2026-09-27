import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useT } from '../../i18n/useI18n'
import { parseGitHubVaultRef, type GitHubErrorKind, type GitHubVaultRef } from './githubApi'
import type { GitHubFormValues } from './githubForm'

const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new'

function Field({ id, label, hint, children }: { id: string; label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-fg-muted">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[0.7rem] leading-relaxed text-fg-muted/80">{hint}</p>}
    </div>
  )
}

/**
 * Modal form for opening a vault out of a GitHub repository: repository (`owner/repo` or a pasted
 * URL), optional branch and vault folder, and a personal access token. `error` is why the previous
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

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const set = (key: keyof GitHubFormValues) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }))

  // A pasted `…/tree/<branch>/<folder>` URL fills in the branch and folder fields.
  function expandRepoUrl() {
    const ref = parseGitHubVaultRef(values.repo)
    if (!ref || (!ref.branch && !ref.subpath)) return
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
      <form onSubmit={submit} className="space-y-4 p-5">
        <h2 id={`${id}-title`} className="font-display text-xl font-bold tracking-wide text-fg">
          {t('github.dialogTitle')}
        </h2>

        <Field id={`${id}-repo`} label={t('github.repoLabel')}>
          <input
            id={`${id}-repo`}
            className="rpg-input"
            value={values.repo}
            onChange={set('repo')}
            onBlur={expandRepoUrl}
            placeholder={t('github.repoPlaceholder')}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1.6fr]">
          <Field id={`${id}-branch`} label={t('github.branchLabel')}>
            <input
              id={`${id}-branch`}
              className="rpg-input"
              value={values.branch}
              onChange={set('branch')}
              placeholder={t('github.branchPlaceholder')}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>
          <Field id={`${id}-subpath`} label={t('github.subpathLabel')} hint={t('github.subpathHint')}>
            <input
              id={`${id}-subpath`}
              className="rpg-input"
              value={values.subpath}
              onChange={set('subpath')}
              placeholder={t('github.subpathPlaceholder')}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>
        </div>

        <Field
          id={`${id}-token`}
          label={t('github.tokenLabel')}
          hint={
            <>
              {t('github.tokenHint')}{' '}
              <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer" className="text-trim underline underline-offset-2">
                {t('github.tokenCreate')} ↗
              </a>
              <br />
              {t('github.tokenCollaborator')}
            </>
          }
        >
          <input
            id={`${id}-token`}
            className="rpg-input font-mono"
            type="password"
            value={values.token}
            onChange={set('token')}
            placeholder="github_pat_…"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </Field>

        <p className="rounded-md border border-trim/25 bg-trim/5 px-3 py-2 text-[0.7rem] leading-relaxed text-fg-muted">{t('github.privacy')}</p>

        {shownError && (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {shownError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
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
