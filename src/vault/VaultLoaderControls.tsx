import { useT } from '../i18n/useI18n'
import { useSampleVaultEdited, useVaultStore } from '../store/vaultStore'
import { SyncSegment } from './github/SyncSegment'

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
  const label = t(granted ? 'vaultLoader.editingEnabled' : denied ? 'vaultLoader.editingDeniedRetry' : 'vaultLoader.enableEditingTitle')
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
        {!granted && <span className="hidden whitespace-nowrap sm:inline">{t('vaultLoader.enableEditing')}</span>}
      </button>
      {showSync && <SyncSegment className="border-l border-inherit" />}
    </div>
  )
}

function ResetIcon() {
  return (
    <svg {...ICON} className="size-[1.05rem]">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

/**
 * The sample vault's stand-in for `EditPill`: editing is always on there, but nothing is saved, so the
 * pill says "Demo" and — once something was changed — offers to restore the original data.
 */
function DemoPill() {
  const t = useT()
  const edited = useSampleVaultEdited()
  const loadSampleVault = useVaultStore((s) => s.loadSampleVault)

  return (
    <div className="flex shrink-0 items-stretch overflow-hidden rounded-full border border-warning/40 bg-warning/5 text-sm font-medium text-warning">
      <span title={t('vaultLoader.demoTooltip')} className="flex cursor-help items-center gap-1.5 px-2.5 py-1.5">
        <LockIcon open />
        <span className="whitespace-nowrap">{t('vaultLoader.demo')}</span>
      </span>
      {edited && (
        <button
          type="button"
          onClick={loadSampleVault}
          title={t('vaultLoader.resetSampleTooltip')}
          aria-label={t('vaultLoader.resetSample')}
          className="flex items-center gap-1.5 border-l border-warning/40 px-2.5 py-1.5 transition hover:bg-warning/15"
        >
          <ResetIcon />
          <span className="hidden whitespace-nowrap sm:inline">{t('vaultLoader.resetSample')}</span>
        </button>
      )}
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
      {source === 'sample' && <DemoPill />}
    </div>
  )
}
