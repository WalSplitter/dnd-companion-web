import { useEffect, useRef } from 'react'
import { useVaultStore } from '../store/vaultStore'
import { isFileSystemAccessSupported } from './vaultLoader'

export function VaultLoaderControls() {
  const status = useVaultStore((s) => s.status)
  const source = useVaultStore((s) => s.source)
  const vaultName = useVaultStore((s) => s.vaultName)
  const reconnectName = useVaultStore((s) => s.reconnectName)
  const loadingProgress = useVaultStore((s) => s.loadingProgress)
  const error = useVaultStore((s) => s.error)
  const editPermission = useVaultStore((s) => s.editPermission)
  const writeError = useVaultStore((s) => s.writeError)
  const loadSampleVault = useVaultStore((s) => s.loadSampleVault)
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
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-fg-muted sm:inline">
        Vault: <span className="font-medium text-fg">{source === 'sample' ? 'Sample data' : vaultName}</span>
      </span>

      {status === 'loading' && (
        <span className="text-sm text-fg-muted">
          Loading{loadingProgress ? ` (${loadingProgress.done}/${loadingProgress.total})` : '…'}
        </span>
      )}
      {error && <span className="text-sm text-danger">{error}</span>}
      {writeError && <span className="text-sm text-danger">Save failed: {writeError}</span>}

      {reconnectName && (
        <button
          type="button"
          onClick={() => void reconnectVault()}
          className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-2"
        >
          Reconnect &quot;{reconnectName}&quot;
        </button>
      )}

      {supportsPicker ? (
        <button
          type="button"
          onClick={() => void loadFromDirectoryPicker()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
        >
          Open vault folder…
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90"
          >
            Open vault folder…
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

      {source === 'user' && (
        <button
          type="button"
          onClick={loadSampleVault}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-fg hover:bg-surface-2"
        >
          Use sample vault
        </button>
      )}

      {source === 'user' && editPermission !== 'unavailable' && (
        <button
          type="button"
          onClick={() => void requestEditPermission()}
          disabled={editPermission === 'granted'}
          title={
            editPermission === 'granted'
              ? 'Changes to HP, conditions and spell slots save straight back to the vault files'
              : 'Grants this tab write access to the vault folder so HP/conditions/spell-slot edits save back to the .md files'
          }
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            editPermission === 'granted'
              ? 'border-success/40 bg-success/10 text-success'
              : editPermission === 'denied'
                ? 'border-danger/40 text-danger hover:bg-surface-2'
                : 'border-border text-fg hover:bg-surface-2'
          }`}
        >
          {editPermission === 'granted' ? '🔓 Editing enabled' : editPermission === 'denied' ? '🔒 Editing denied — retry' : '🔒 Enable editing'}
        </button>
      )}
    </div>
  )
}
