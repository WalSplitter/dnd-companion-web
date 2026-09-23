import { useEffect, useState } from 'react'
import { useT, type TranslationKey } from '../i18n/I18nContext'
import { formatErrorReport, reportError, useErrorLogStore, type ErrorLogEntry } from '../store/errorLogStore'

/** Red-neon glass log in the bottom-right corner; one card per error, stacked. Also catches
 * otherwise-uncaught runtime errors so nothing fails silently. */
export function ErrorToaster() {
  const t = useT()
  const entries = useErrorLogStore((s) => s.entries)
  const dismiss = useErrorLogStore((s) => s.dismiss)
  const clear = useErrorLogStore((s) => s.clear)

  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError({ title: t('errorLog.unexpected'), source: 'window.onerror', error: e.error ?? e.message })
    const onRejection = (e: PromiseRejectionEvent) => reportError({ title: t('errorLog.unexpected'), source: 'unhandledrejection', error: e.reason })
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [t])

  if (entries.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-h-[calc(100vh-2rem)] w-[min(26rem,calc(100vw-2rem))] flex-col-reverse gap-3 overflow-y-auto p-1">
      {[...entries].reverse().map((entry) => (
        <ErrorCard key={entry.id} entry={entry} onClose={() => dismiss(entry.id)} />
      ))}
      {entries.length > 1 && (
        <button
          type="button"
          onClick={clear}
          className="pointer-events-auto cursor-pointer self-end rounded-full border border-danger/40 bg-black/50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-danger backdrop-blur hover:border-danger hover:shadow-[0_0_12px_-2px_var(--color-danger)]"
        >
          {t('errorLog.clearAll')} ({entries.length})
        </button>
      )}
    </div>
  )
}

function ErrorCard({ entry, onClose }: { entry: ErrorLogEntry; onClose: () => void }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const title = entry.title.startsWith('errorLog.') ? t(entry.title as TranslationKey) : entry.title
  const details = formatErrorReport(entry, title)

  async function copy() {
    try {
      await navigator.clipboard.writeText(details)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setOpen(true) // clipboard blocked — show the text so it can be selected by hand
    }
  }

  const iconButton =
    'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-danger/40 text-danger transition hover:border-danger hover:bg-danger/15 hover:shadow-[0_0_10px_-2px_var(--color-danger)]'

  return (
    <div
      role="alert"
      className="pointer-events-auto relative shrink-0 overflow-hidden rounded-lg border border-danger/70 bg-[color-mix(in_srgb,var(--color-danger)_10%,rgb(12_4_6/0.82))] p-3 shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-danger)_25%,transparent),0_0_22px_-2px_color-mix(in_srgb,var(--color-danger)_60%,transparent),inset_0_0_24px_-14px_var(--color-danger)] backdrop-blur-md"
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-danger to-transparent" />
      <div className="flex items-start gap-2">
        <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-danger shadow-[0_0_8px_2px_var(--color-danger)]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <div className="font-display text-xs font-bold uppercase tracking-[0.12em] text-danger [text-shadow:0_0_10px_color-mix(in_srgb,var(--color-danger)_70%,transparent)]">
              {title}
            </div>
            {entry.count > 1 && <span className="rounded-full bg-danger/20 px-1.5 text-[0.65rem] font-bold text-danger">×{entry.count}</span>}
          </div>
          <div className="mt-1 break-words text-sm text-fg">{entry.message}</div>
          <div className="mt-0.5 font-mono text-[0.65rem] text-fg-muted">
            {entry.source} · {new Date(entry.time).toLocaleTimeString()}
          </div>
        </div>
        <button type="button" onClick={() => void copy()} className={iconButton} title={t('errorLog.copy')} aria-label={t('errorLog.copy')}>
          {copied ? '✓' : '⧉'}
        </button>
        <button type="button" onClick={onClose} className={iconButton} title={t('errorLog.close')} aria-label={t('errorLog.close')}>
          ×
        </button>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 cursor-pointer text-[0.65rem] font-semibold uppercase tracking-wider text-danger/80 hover:text-danger"
      >
        {open ? '▾' : '▸'} {t('errorLog.details')}
      </button>
      {open && (
        <pre className="mt-1.5 max-h-56 overflow-auto rounded-md border border-danger/25 bg-black/40 p-2 font-mono text-[0.65rem] leading-relaxed text-fg-muted">
          {details}
        </pre>
      )}
    </div>
  )
}
