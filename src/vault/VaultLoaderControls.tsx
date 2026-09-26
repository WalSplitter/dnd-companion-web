import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import { isFileSystemAccessSupported } from './vaultLoader'

export function VaultLoaderControls() {
  const t = useT()
  const status = useVaultStore((s) => s.status)
  const source = useVaultStore((s) => s.source)
  const vaultName = useVaultStore((s) => s.vaultName)
  const loadingProgress = useVaultStore((s) => s.loadingProgress)
  const editPermission = useVaultStore((s) => s.editPermission)
  const loadFromDirectoryPicker = useVaultStore((s) => s.loadFromDirectoryPicker)
  const loadFromFileList = useVaultStore((s) => s.loadFromFileList)
  const requestEditPermission = useVaultStore((s) => s.requestEditPermission)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  // A newly opened vault has different characters — start over at its list.
  const openedAt = (ok: boolean) => {
    if (ok) navigate('/characters')
  }

  const supportsPicker = isFileSystemAccessSupported()

  return (
    <div className="flex flex-nowrap items-center gap-2">
      <span className="hidden max-w-[12rem] shrink-0 items-baseline gap-1 rounded-full border border-trim/30 bg-trim/5 px-2.5 py-1 text-xs text-fg-muted sm:inline-flex">
        <span className="shrink-0">{t('vaultLoader.label')}</span>
        <span className="truncate font-semibold text-trim" title={source === 'user' ? vaultName ?? undefined : undefined}>
          {source === 'sample' ? t('vaultLoader.sampleData') : vaultName}
        </span>
      </span>

      {status === 'loading' && (
        <span className="text-sm text-fg-muted">
          {loadingProgress
            ? t('vaultLoader.loadingProgress', { done: loadingProgress.done, total: loadingProgress.total })
            : t('vaultLoader.loadingEllipsis')}
        </span>
      )}

      {supportsPicker ? (
        <button type="button" onClick={() => void loadFromDirectoryPicker().then(openedAt)} className="rpg-button shrink-0 whitespace-nowrap">
          {t('vaultLoader.openVaultFolder')}
        </button>
      ) : (
        <>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="rpg-button shrink-0 whitespace-nowrap">
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
              if (e.target.files) void loadFromFileList(e.target.files).then(openedAt)
            }}
          />
        </>
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
          className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            editPermission === 'granted'
              ? 'border-success/40 bg-success/10 text-success'
              : editPermission === 'denied'
                ? 'border-danger/40 text-danger hover:bg-surface-2'
                : 'border-trim/40 text-fg hover:bg-trim/10'
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
