import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { initials } from '../../components/initials'
import { useI18n, type TranslationKey } from '../../i18n/useI18n'
import { characterRoute } from '../../routes/paths'
import { sampleChronicleCommits } from '../../sample-vault/chronicle'
import { activeGitHubSource, useVaultStore } from '../../store/vaultStore'
import { fieldLabel } from '../../vault/github/commitMessage'
import { COMMITS_PER_PAGE, GitHubError, listCommits, type GitHubCommit } from '../../vault/github/githubApi'
import { buildChronicle, type ChronicleChange, type ChronicleCharacter, type ChronicleManualEdit, type ChronicleSession } from './chronicle'

type LoadState = { state: 'loading' } | { state: 'idle'; more: boolean } | { state: 'error'; hint: TranslationKey }

type PageResult = { commits: GitHubCommit[] } | { error: TranslationKey }

/** One page of the open GitHub vault's history, or what went wrong. The sample vault has a made-up
 * history of its own, all on one page. */
async function fetchHistoryPage(page: number): Promise<PageResult> {
  if (useVaultStore.getState().source === 'sample') return { commits: page === 1 ? sampleChronicleCommits() : [] }
  const source = activeGitHubSource()
  if (!source) return { commits: [] }
  try {
    return { commits: await listCommits(source.token, source.ref, page) }
  } catch (err) {
    console.error('[chronicle] loading commits failed:', err)
    return { error: err instanceof GitHubError ? `github.error.${err.kind}` : 'chronicle.failed' }
  }
}

/** Pages through the open GitHub vault's commit history, newest first — the first page on mount. */
function useCommitHistory() {
  const [commits, setCommits] = useState<GitHubCommit[]>([])
  const [page, setPage] = useState(0)
  const [load, setLoad] = useState<LoadState>({ state: 'loading' })

  const apply = useCallback((n: number, result: PageResult) => {
    if ('error' in result) return setLoad({ state: 'error', hint: result.error })
    setCommits((prev) => (n === 1 ? result.commits : [...prev, ...result.commits]))
    setPage(n)
    setLoad({ state: 'idle', more: result.commits.length === COMMITS_PER_PAGE })
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchHistoryPage(1).then((result) => {
      if (!cancelled) apply(1, result)
    })
    return () => {
      cancelled = true
    }
  }, [apply])

  /** "Load older" and "try again" alike: the page after the last one that arrived. */
  const fetchNext = () => {
    const n = page + 1
    setLoad({ state: 'loading' })
    void fetchHistoryPage(n).then((result) => apply(n, result))
  }
  return { commits, load, loadMore: fetchNext, retry: fetchNext }
}

function ChangeLine({ change }: { change: ChronicleChange }) {
  const { t } = useI18n()
  if (change.kind === 'created') return <li className="text-fg-muted">{t('chronicle.created', { note: change.note })}</li>
  const steps = change.steps > 1 ? t('chronicle.steps', { count: change.steps }) : undefined
  return (
    <li className="flex flex-wrap items-baseline gap-x-2" title={steps}>
      <span className="text-fg-muted">{fieldLabel(change.key.split('.'))}</span>
      {change.kind === 'set' ? (
        <span className="font-num text-fg">
          {change.from ?? '–'} <span className="text-trim">→</span> {change.to ?? '–'}
        </span>
      ) : (
        <span className="italic text-fg">{t('chronicle.updated')}</span>
      )}
      {steps && <span className="text-[0.65rem] text-fg-muted/80">({steps})</span>}
    </li>
  )
}

function CharacterEntry({ entry, known }: { entry: ChronicleCharacter; known: boolean }) {
  const { t } = useI18n()
  return (
    <li className="journal-entry relative">
      <span aria-hidden className="journal-node font-display text-[0.7rem] font-bold text-trim">
        {initials(entry.name)}
      </span>
      <article className="journal-card border-l-4 border-l-trim/60">
        <header className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
          {known ? (
            <Link to={characterRoute(entry.name)} className="journal-link font-display text-sm font-bold tracking-wide">
              {entry.name}
            </Link>
          ) : (
            <h4 className="font-display text-sm font-bold tracking-wide text-fg">{entry.name}</h4>
          )}
          {entry.editors.length > 0 && (
            <span className="text-[0.7rem] text-fg-muted">{t('chronicle.editedBy', { names: entry.editors.map((e) => `@${e}`).join(', ') })}</span>
          )}
        </header>
        <ul className="space-y-0.5 text-sm">
          {entry.changes.map((c) => (
            <ChangeLine key={c.kind === 'created' ? `created:${c.note}` : c.key} change={c} />
          ))}
        </ul>
      </article>
    </li>
  )
}

function ManualEntry({ edits }: { edits: ChronicleManualEdit[] }) {
  const { t } = useI18n()
  return (
    <li className="journal-entry relative">
      <span aria-hidden className="journal-node text-fg-muted">
        ✎
      </span>
      <article className="journal-card border-l-4 border-l-fg-muted/40">
        <h4 className="mb-1.5 font-display text-sm font-bold tracking-wide text-fg-muted">{t('chronicle.manual')}</h4>
        <ul className="space-y-1 text-sm">
          {edits.map((e) => (
            <li key={e.author}>
              <a href={e.url} target="_blank" rel="noreferrer" className="journal-link" title={t('chronicle.viewOnGitHub')}>
                {e.author}
              </a>{' '}
              <span className="font-num text-fg-muted">· {e.count}×</span>
              {e.subjects.length > 0 && <span className="block truncate text-[0.75rem] text-fg-muted/80">{e.subjects.slice(-3).join(' · ')}</span>}
            </li>
          ))}
        </ul>
      </article>
    </li>
  )
}

function SessionSection({ session, known }: { session: ChronicleSession; known: Set<string> }) {
  const { t, lang } = useI18n()
  const date = (d: Date) => d.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  const time = (d: Date) => d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  const sameDay = session.start.toDateString() === session.end.toDateString()
  const label = sameDay ? date(session.start) : `${date(session.start)} – ${date(session.end)}`

  return (
    <section aria-label={label}>
      <h3 className="journal-session-title mb-3 flex-wrap">
        <span>{label}</span>
        <span className="text-[0.7rem] font-normal tracking-normal text-fg-muted normal-case">
          {time(session.start)}–{time(session.end)} · {t('chronicle.commits', { count: session.commits })}
        </span>
        <span aria-hidden className="h-px flex-1 bg-linear-to-r from-trim/40 to-transparent" />
      </h3>
      <ol className="journal-timeline">
        {session.characters.map((c) => (
          <CharacterEntry key={c.name} entry={c} known={known.has(c.name)} />
        ))}
        {session.manual.length > 0 && <ManualEntry edits={session.manual} />}
      </ol>
    </section>
  )
}

/**
 * The party's chronicle: the GitHub vault's commit history read back as play sessions — per character,
 * which values changed from what to what. Commits made outside the app show as "edited by hand".
 */
export function ChroniclePanel() {
  const { t } = useI18n()
  const characters = useVaultStore((s) => s.vault.characters)
  const { commits, load, loadMore, retry } = useCommitHistory()
  const sessions = useMemo(() => buildChronicle(commits), [commits])
  const known = useMemo(() => new Set(characters.map((c) => c.frontmatter.name)), [characters])

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-muted">{t('chronicle.intro')}</p>

      {sessions.map((s) => (
        <SessionSection key={s.start.toISOString()} session={s} known={known} />
      ))}

      {load.state === 'loading' && <p className="py-4 text-center text-sm text-fg-muted">{t('chronicle.loading')}</p>}
      {load.state === 'idle' && sessions.length === 0 && <p className="py-8 text-center text-sm text-fg-muted">{t('chronicle.empty')}</p>}
      {load.state === 'idle' && load.more && (
        <div className="text-center">
          <button type="button" onClick={loadMore} className="journal-submit">
            {t('chronicle.loadMore')}
          </button>
        </div>
      )}
      {load.state === 'error' && (
        <div className="rounded-lg border border-danger/40 p-4 text-center text-sm">
          <p className="font-semibold text-fg">{t('chronicle.failed')}</p>
          {load.hint !== 'chronicle.failed' && <p className="mt-1 text-fg-muted">{t(load.hint)}</p>}
          <button type="button" onClick={retry} className="journal-submit mt-3">
            {t('chronicle.retry')}
          </button>
        </div>
      )}
    </div>
  )
}
