import { lazy, Suspense, useState } from 'react'
import { useT } from '../i18n/useI18n'

// Only downloaded when someone opens it
const LicensesDialog = lazy(() => import('./LicensesDialog').then((m) => ({ default: m.LicensesDialog })))

const AUTHOR_URL = 'https://github.com/WalSplitter'
const REPO_URL = 'https://github.com/WalSplitter/dnd-companion-web'

// A little taller on touch screens, where they are tapped rather than clicked — also a phone held sideways
const PILL = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 transition-colors pointer-coarse:py-1.5'

/** A sealed scroll, for the licenses. */
function ScrollMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 text-trim/80 transition-transform group-hover:-rotate-6 group-hover:text-trim" aria-hidden>
      <path
        d="M4 2.5h7.5a1.5 1.5 0 0 1 1.5 1.5v7.5M4 2.5A1.5 1.5 0 0 0 2.5 4v.5H4M4 2.5A1.5 1.5 0 0 1 5.5 4v8a1.5 1.5 0 0 0 1.5 1.5h5.5M13 11.5v.5a1.5 1.5 0 0 1-1.5 1.5H7M7.5 6h3.5M7.5 8.5h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.4" r="1.9" fill="currentColor" />
    </svg>
  )
}

/** GitHub's mark, drawn in the current text colour. */
function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  )
}

/** Quiet credit line under every page: a trim rule with a centre gem, the author, and the licenses and source links. */
export function AppFooter() {
  const t = useT()
  const [licensesOpen, setLicensesOpen] = useState(false)
  return (
    <footer className="relative mx-auto w-full max-w-6xl px-4 py-2.5">
      <div className="absolute inset-x-4 top-0 flex -translate-y-1/2 items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-linear-to-r from-transparent to-trim/30" />
        <span className="size-1.5 rotate-45 border border-trim/50 bg-trim/15" />
        <span className="h-px flex-1 bg-linear-to-l from-transparent to-trim/30" />
      </div>
      <div className="flex flex-col items-center justify-between gap-2 text-xs text-fg-muted sm:flex-row">
        <p className="text-center">
          <span className="font-display font-semibold tracking-wide text-fg/80">{t('app.brand')}</span>
          <span className="mx-2 text-trim/40" aria-hidden>
            ·
          </span>
          {t('app.createdBy')}{' '}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-trim underline-offset-4 hover:underline"
          >
            WalSplitter
          </a>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setLicensesOpen(true)}
            title={t('app.licensesHint')}
            className={`group ${PILL} border-trim/20 hover:border-trim/50 hover:bg-trim/10 hover:text-fg`}
          >
            <ScrollMark />
            {t('app.licenses')}
          </button>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className={`${PILL} border-trim/20 hover:border-trim/50 hover:text-fg`}>
            <GitHubMark />
            {t('app.sourceCode')}
          </a>
        </div>
      </div>
      {licensesOpen && (
        <Suspense fallback={null}>
          <LicensesDialog onClose={() => setLicensesOpen(false)} />
        </Suspense>
      )}
    </footer>
  )
}
