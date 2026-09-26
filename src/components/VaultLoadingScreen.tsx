import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import { ArcaneSigil } from './ArcaneSigil'

/** Full-screen "the vault is opening" veil: a spinning sigil over the page, with a note count once
 * the folder walk knows how many notes there are. */
export function VaultLoadingScreen() {
  const t = useT()
  const progress = useVaultStore((s) => s.loadingProgress)
  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null

  return (
    <div className="vault-loading fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 px-4" role="status" aria-live="polite">
      <ArcaneSigil className="vault-loading-sigil size-40" />
      <p className="font-display text-xl font-bold tracking-wide text-fg">{t('start.loadingTitle')}</p>
      <div className="w-64 max-w-full">
        <div className="relative h-1.5 overflow-hidden rounded-full border border-trim/30 bg-black/30">
          <div
            className={`vault-loading-bar h-full rounded-full ${percent === null ? 'is-indeterminate' : ''}`}
            style={percent !== null ? { width: `${percent}%` } : undefined}
          />
        </div>
        <p className="mt-2 h-4 text-center font-num text-xs text-fg-muted">
          {progress && progress.total > 0 ? t('start.loadingFiles', { done: progress.done, total: progress.total }) : ''}
        </p>
      </div>
    </div>
  )
}
