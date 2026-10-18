import { useState } from 'react'
import { useT } from '../i18n/useI18n'
import { applyAppUpdate, useAppUpdate } from '../pwa/serviceWorker'

/** Bottom-left note that a newer build is ready; reloading into it is the user's call, never a surprise. */
export function UpdateToast() {
  const t = useT()
  const waiting = useAppUpdate((s) => s.waiting)
  const [dismissed, setDismissed] = useState<ServiceWorker | null>(null)
  if (!waiting || dismissed === waiting) return null

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border border-trim/40 bg-surface/95 px-3 py-2 text-sm text-fg shadow-lg backdrop-blur"
    >
      <span>{t('app.updateReady')}</span>
      <button type="button" onClick={applyAppUpdate} className="rpg-button shrink-0 px-2.5 py-1 text-xs">
        {t('app.updateReload')}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(waiting)}
        title={t('errorLog.close')}
        aria-label={t('errorLog.close')}
        className="shrink-0 rounded-md px-1.5 text-fg-muted transition hover:bg-surface-2 hover:text-fg"
      >
        ×
      </button>
    </div>
  )
}
