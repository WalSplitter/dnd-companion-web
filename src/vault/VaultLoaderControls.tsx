import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import { SyncSegment } from './github/SyncSegment'
import { isFileSystemAccessSupported } from './vaultLoader'

const ICON = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

function LockIcon({ open }: { open: boolean }) {
  return (
    <svg {...ICON} className="size-[1.05rem]">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d={open ? 'M8 11V7a4 4 0 0 1 7.6-1.8' : 'M8 11V7a4 4 0 0 1 8 0v4'} />
    </svg>
  )
}

/** Where the open vault came from: a folder on this device, or a GitHub repository. */
function SourceIcon({ github }: { github: boolean }) {
  return github ? (
    <svg {...ICON} className="size-3.5 shrink-0">
      <circle cx="7" cy="5.5" r="2" />
      <circle cx="7" cy="18.5" r="2" />
      <circle cx="17" cy="8.5" r="2" />
      <path d="M7 7.5v9M17 10.5c0 4.5-10 3-10 6" />
    </svg>
  ) : (
    <svg {...ICON} className="size-3.5 shrink-0">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  )
}

/**
 * Edit mode and — for a GitHub vault — where the edits stand, as one compact pill: a lock (click to
 * switch editing on; open and green once it is) and a cloud (see `SyncSegment`). Words go in the
 * tooltips; only the call to action "Edit" is spelled out while editing is off.
 */
function EditPill() {
  const t = useT()
  const editPermission = useVaultStore((s) => s.editPermission)
  const fromGitHub = useVaultStore((s) => s.github !== null)
  const syncState = useVaultStore((s) => s.sync?.state)
  const requestEditPermission = useVaultStore((s) => s.requestEditPermission)
  const granted = editPermission === 'granted'
  const denied = editPermission === 'denied'

  const tooltip = fromGitHub
    ? t(granted ? 'github.editTooltipGranted' : denied ? 'github.editTooltipDenied' : 'github.editTooltipNotGranted')
    : t(granted ? 'vaultLoader.enableEditingTooltipGranted' : 'vaultLoader.enableEditingTooltipNotGranted')
  const label = t(granted ? 'vaultLoader.editingEnabled' : denied ? 'vaultLoader.editingDeniedRetry' : 'vaultLoader.enableEditing')
  // Queued edits (e.g. restored from a closed tab) still show while editing is off.
  const showSync = fromGitHub && (granted || (syncState !== undefined && syncState !== 'synced'))

  return (
    <div
      className={`flex shrink-0 items-stretch overflow-hidden rounded-full border text-sm font-medium ${
        granted ? 'border-success/40 bg-success/5' : denied ? 'border-danger/40' : 'border-trim/40'
      }`}
    >
      <button
        type="button"
        onClick={() => void requestEditPermission()}
        disabled={granted}
        title={`${label} — ${tooltip}`}
        aria-label={label}
        className={`flex items-center gap-1.5 py-1.5 transition ${granted ? 'px-2.5 text-success' : 'px-3 hover:bg-trim/10'} ${
          denied ? 'text-danger' : granted ? '' : 'text-fg'
        }`}
      >
        <LockIcon open={granted} />
        {!granted && <span className="whitespace-nowrap">{t('vaultLoader.enableEditing')}</span>}
      </button>
      {showSync && <SyncSegment className="border-l border-inherit" />}
    </div>
  )
}

export function VaultLoaderControls() {
  const t = useT()
  const status = useVaultStore((s) => s.status)
  const source = useVaultStore((s) => s.source)
  const vaultName = useVaultStore((s) => s.vaultName)
  const loadingProgress = useVaultStore((s) => s.loadingProgress)
  const editPermission = useVaultStore((s) => s.editPermission)
  const fromGitHub = useVaultStore((s) => s.github !== null)
  const ruleset = useVaultStore((s) => s.ruleset)
  const loadFromDirectoryPicker = useVaultStore((s) => s.loadFromDirectoryPicker)
  const loadFromFileList = useVaultStore((s) => s.loadFromFileList)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  // A newly opened vault has different characters — start over at its list.
  const openedAt = (ok: boolean) => {
    if (ok) navigate('/characters')
  }

  const supportsPicker = isFileSystemAccessSupported()

  return (
    <div className="flex flex-nowrap items-center gap-2">
      {/* The vault's name, with the detected ruleset in its tooltip (a best-effort guess, see `detectRuleset.ts`). */}
      <span
        className="hidden max-w-[12rem] shrink-0 items-center gap-1.5 rounded-full border border-trim/30 bg-trim/5 px-2.5 py-1 text-xs text-trim sm:inline-flex"
        title={[
          `${t('vaultLoader.label')} ${source === 'sample' ? t('vaultLoader.sampleData') : vaultName}`,
          `${t('ruleset.badgeLabel')}: ${t(`ruleset.${ruleset.ruleset}`)} — ${t('ruleset.tooltipHeuristic')}`,
          ...(ruleset.evidence.length > 0 ? [ruleset.evidence.join('; ')] : []),
        ].join('\n')}
      >
        <SourceIcon github={fromGitHub} />
        <span className="truncate font-semibold">{source === 'sample' ? t('vaultLoader.sampleData') : vaultName}</span>
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

      {/* A user vault without file handles came through the <input webkitdirectory> fallback — say why editing is missing. */}
      {source === 'user' && editPermission === 'unavailable' && (
        <span
          title={t('vaultLoader.readOnlyTooltip')}
          className="shrink-0 cursor-help whitespace-nowrap rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 text-sm font-medium text-warning"
        >
          {t('vaultLoader.readOnly')}
        </span>
      )}

      {source === 'user' && editPermission !== 'unavailable' && <EditPill />}
    </div>
  )
}
