import { useT } from '../i18n/useI18n'

const AUTHOR_URL = 'https://github.com/WalSplitter'
const REPO_URL = 'https://github.com/WalSplitter/dnd-companion-web'
const SPONSOR_URL = 'https://github.com/sponsors/WalSplitter'

const PILL = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors'

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

/** GitHub Sponsors' heart; pink like on GitHub. */
function HeartMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 text-[#db61a2] transition-transform group-hover:scale-110" aria-hidden>
      <path
        fill="currentColor"
        d="M7.655 14.916v-.001h-.002l-.006-.003-.018-.01a22.066 22.066 0 0 1-3.744-2.584C2.045 10.731 0 8.35 0 5.5 0 2.836 2.086 1 4.25 1 5.797 1 7.153 1.802 8 3.02 8.847 1.802 10.203 1 11.75 1 13.914 1 16 2.836 16 5.5c0 2.85-2.045 5.231-3.885 6.818a22.066 22.066 0 0 1-3.744 2.584l-.018.01-.006.003h-.002ZM8 13.28a20.5 20.5 0 0 0 3.14-2.162C12.855 9.635 14.5 7.608 14.5 5.5c0-1.863-1.43-3-2.75-3-1.378 0-2.585.883-3.057 2.18a.75.75 0 0 1-1.386 0C6.835 3.383 5.628 2.5 4.25 2.5c-1.32 0-2.75 1.137-2.75 3 0 2.108 1.645 4.135 3.36 5.618A20.5 20.5 0 0 0 8 13.28Z"
      />
    </svg>
  )
}

/** Quiet credit line under every page: a trim rule with a centre gem, the author, the source and a sponsor link. */
export function AppFooter() {
  const t = useT()
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-5 pt-8">
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-linear-to-r from-transparent to-trim/30" />
        <span className="size-1.5 rotate-45 border border-trim/50 bg-trim/15" />
        <span className="h-px flex-1 bg-linear-to-l from-transparent to-trim/30" />
      </div>
      <div className="mt-3 flex flex-col items-center justify-between gap-2 text-xs text-fg-muted sm:flex-row">
        <p>
          <span className="font-display font-semibold tracking-wide text-fg/80">{t('app.brand')}</span>
          <span className="mx-2 text-trim/40" aria-hidden>
            ·
          </span>
          {t('app.createdBy')}{' '}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-trim/80 underline-offset-4 transition-colors hover:text-trim hover:underline"
          >
            WalSplitter
          </a>
        </p>
        <div className="flex items-center gap-2">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className={`${PILL} border-trim/20 hover:border-trim/50 hover:text-fg`}>
            <GitHubMark />
            {t('app.sourceCode')}
          </a>
          <a
            href={SPONSOR_URL}
            title={t('app.sponsorHint')}
            target="_blank"
            rel="noreferrer"
            className={`group ${PILL} border-[#db61a2]/30 hover:border-[#db61a2]/70 hover:bg-[#db61a2]/10 hover:text-fg`}
          >
            <HeartMark />
            {t('app.sponsor')}
          </a>
        </div>
      </div>
    </footer>
  )
}
