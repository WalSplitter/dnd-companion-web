import { useEffect, useRef } from 'react'
import { useT } from '../i18n/I18nContext'
import { useVaultStore } from '../store/vaultStore'
import { isFileSystemAccessSupported } from './vaultLoader'

export function VaultLoaderControls() {
  const t = useT()
  const status = useVaultStore((s) => s.status)
  const source = useVaultStore((s) => s.source)
  const vaultName = useVaultStore((s) => s.vaultName)
  const reconnectName = useVaultStore((s) => s.reconnectName)
  const loadingProgress = useVaultStore((s) => s.loadingProgress)
  const error = useVaultStore((s) => s.error)
  const editPermission = useVaultStore((s) => s.editPermission)
  const writeError = useVaultStore((s) => s.writeError)
  const loadSampleVault = useVaultStore((s) => s.loadSampleVault)
  const loadDevVault = useVaultStore((s) => s.loadDevVault)
  const loadFromDirectoryPicker = useVaultStore((s) => s.loadFromDirectoryPicker)
  const loadFromFileList = useVaultStore((s) => s.loadFromFileList)
  const restoreLastVault = useVaultStore((s) => s.restoreLastVault)
  const reconnectVault = useVaultStore((s) => s.reconnectVault)
  const requestEditPermission = useVaultStore((s) => s.requestEditPermission)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void restoreLastVault()
    // Only ever attempt this once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const supportsPicker = isFileSystemAccessSupported()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hidden max-w-[12rem] items-baseline gap-1 text-sm text-fg-muted sm:inline-flex">
        <span className="shrink-0">{t('vaultLoader.label')}</span>
        <span className="truncate font-medium text-fg" title={source === 'user' ? vaultName ?? undefined : undefined}>
          {source === 'sample' ? t('vaultLoader.sampleData') : source === 'dev' ? t('vaultLoader.devData') : vaultName}
        </span>
      </span>

      {status === 'loading' && (
        <span className="text-sm text-fg-muted">
          {loadingProgress
            ? t('vaultLoader.loadingProgress', { done: loadingProgress.done, total: loadingProgress.total })
            : t('vaultLoader.loadingEllipsis')}
        </span>
      )}
      {error && <span className="text-sm text-danger">{error}</span>}
      {writeError && <span className="text-sm text-danger">{t('vaultLoader.saveFailed', { message: writeError })}</span>}

      {reconnectName && (
        <button
          type="button"
          onClick={() => void reconnectVault()}
          title={t('vaultLoader.reconnect', { name: reconnectName })}
          className="max-w-[12rem] truncate rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-2"
        >
          {t('vaultLoader.reconnect', { name: reconnectName })}
        </button>
      )}

      {supportsPicker ? (
        <button
          type="button"
          onClick={() => void loadFromDirectoryPicker()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
        >
          {t('vaultLoader.openVaultFolder')}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
          >
            {t('vaultLoader.openVaultFolder')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            // @ts-expect-error non-standard attribute, only relevant as a fallback for browsers without FSA
            webkitdirectory=""
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) void loadFromFileList(e.target.files)
            }}
          />
        </>
      )}

      {source !== 'sample' && (
        <button
          type="button"
          onClick={loadSampleVault}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2"
        >
          {t('vaultLoader.useSampleVault')}
        </button>
      )}

      {/* TEMPORARY, dev-only — see `src/dev-vault/index.ts`. Remove once the DM's real vault has
          character/item sheets to develop the inventory UI against instead. */}
      {import.meta.env.DEV && source !== 'dev' && (
        <button
          type="button"
          onClick={() => void loadDevVault()}
          className="rounded-md border border-dashed border-border px-3 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-2"
        >
          {t('vaultLoader.loadDevVault')}
        </button>
      )}

      {source === 'user' && editPermission !== 'unavailable' && (
        <button
          type="button"
          onClick={() => void requestEditPermission()}
          disabled={editPermission === 'granted'}
          title={
            editPermission === 'granted'
              ? t('vaultLoader.enableEditingTooltipGranted')
              : t('vaultLoader.enableEditingTooltipNotGranted')
          }
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            editPermission === 'granted'
              ? 'border-success/40 bg-success/10 text-success'
              : editPermission === 'denied'
                ? 'border-danger/40 text-danger hover:bg-surface-2'
                : 'border-border text-fg hover:bg-surface-2'
          }`}
        >
          {editPermission === 'granted'
            ? t('vaultLoader.editingEnabled')
            : editPermission === 'denied'
              ? t('vaultLoader.editingDeniedRetry')
              : t('vaultLoader.enableEditing')}
        </button>
      )}
    </div>
  )
}
