import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { useT } from '../i18n/useI18n'
import { ArcaneSigil } from './ArcaneSigil'

/** One bundled package, as the build writes it to `third-party-licenses.json` (see `thirdPartyLicenses` in vite.config.ts). */
interface LicenseEntry {
  name: string
  version: string
  identifier?: string
  text?: string
}

const LICENSES_URL = `${import.meta.env.BASE_URL}third-party-licenses`
const OWN_LICENSE_URL = 'https://github.com/WalSplitter/dnd-companion-web/blob/main/LICENSE'

/** Fonts get a seal of their own colour, so the three of them stand out from the code. */
const family = (identifier = '') => (/OFL/i.test(identifier) ? 'font' : /^(MIT|ISC|0?BSD|BSD-\d-Clause|Apache-2\.0|Unlicense|CC0)/i.test(identifier) ? 'permissive' : 'other')

function Seal({ identifier, count }: { identifier?: string; count?: number }) {
  return (
    <span className="license-seal" data-family={family(identifier)}>
      {identifier ?? '?'}
      {count !== undefined && <b>{count}</b>}
    </span>
  )
}

/**
 * The open-source packages the app ships, with their licenses — which ask for exactly this: their
 * copyright notice and license text along with every copy. Loads the list the build wrote only
 * when opened; each package unfolds to its full license text.
 */
export function LicensesDialog({ onClose }: { onClose: () => void }) {
  const t = useT()
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [entries, setEntries] = useState<LicenseEntry[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`${LICENSES_URL}.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: unknown) => {
        if (cancelled) return
        if (Array.isArray(data)) setEntries(data as LicenseEntry[])
        else setFailed(true)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [])

  const counts = new Map<string | undefined, number>()
  for (const entry of entries ?? []) counts.set(entry.identifier, (counts.get(entry.identifier) ?? 0) + 1)

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // A press on the backdrop lands on the dialog itself; inside, it lands on its content.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="licenses-dialog rpg-panel m-auto w-[min(40rem,calc(100vw-1.5rem))] bg-surface p-0 text-fg"
    >
      <div className="licenses-scroll">
        <header className="licenses-head">
          <ArcaneSigil className="licenses-sigil" />
          <div className="min-w-0 flex-1">
            <p className="licenses-kicker">{t('licenses.kicker')}</p>
            <h2 id={`${id}-title`} className="font-display text-xl font-bold tracking-wide text-fg sm:text-2xl">
              {t('licenses.title')}
            </h2>
            <p className="mt-1.5 text-sm text-fg-muted">{t('licenses.intro')}</p>
          </div>
          <button type="button" className="licenses-close" onClick={onClose} aria-label={t('licenses.close')} title={t('licenses.close')}>
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {entries && (
          <div className="licenses-seals" aria-label={t('licenses.summary')}>
            {[...counts].map(([identifier, count]) => (
              <Seal key={identifier ?? '?'} identifier={identifier} count={count} />
            ))}
          </div>
        )}

        {failed ? (
          <p className="licenses-note">
            {t('licenses.failed')}{' '}
            <a href={`${LICENSES_URL}.txt`} target="_blank" rel="noreferrer" className="text-trim underline-offset-2 hover:underline">
              {t('licenses.plainText')} ↗
            </a>
          </p>
        ) : !entries ? (
          <p className="licenses-note animate-pulse">{t('licenses.loading')}</p>
        ) : (
          <ul className="licenses-list">
            {entries.map((entry, i) => (
              <li key={entry.name} style={{ '--i': i } as CSSProperties}>
                <details className="license-entry">
                  <summary>
                    <span className="license-gem" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-semibold text-fg">{entry.name}</span>
                    <span className="hidden text-xs text-fg-muted tabular-nums min-[420px]:inline">{entry.version}</span>
                    <Seal identifier={entry.identifier} />
                    <svg viewBox="0 0 16 16" className="license-chevron" aria-hidden>
                      <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="license-body">
                    <a href={`https://www.npmjs.com/package/${entry.name}/v/${entry.version}`} target="_blank" rel="noreferrer" className="license-npm">
                      {entry.name}@{entry.version} {t('licenses.onNpm')} ↗
                    </a>
                    <pre>{entry.text ?? t('licenses.noText')}</pre>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}

        <footer className="licenses-foot">
          <p>
            {t('licenses.own')}{' '}
            <a href={OWN_LICENSE_URL} target="_blank" rel="noreferrer" className="font-semibold text-trim underline-offset-2 hover:underline">
              {t('licenses.ownLink')} ↗
            </a>
          </p>
          <a href={`${LICENSES_URL}.txt`} target="_blank" rel="noreferrer" className="text-trim/80 underline-offset-2 hover:text-trim hover:underline">
            {t('licenses.plainText')} ↗
          </a>
        </footer>
      </div>
    </dialog>
  )
}
