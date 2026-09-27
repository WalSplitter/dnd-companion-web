import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useT } from '../../i18n/useI18n'
import { useVaultStore } from '../../store/vaultStore'
import type { SyncConflict, SyncStatus } from './githubSync'

function formatValue(value: unknown): string {
  if (value === undefined) return '–'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/** Lists what was changed on both sides and lets the user pick whose values win. */
function ConflictDialog({ conflicts, onClose }: { conflicts: SyncConflict[]; onClose: () => void }) {
  const t = useT()
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const resolve = useVaultStore((s) => s.resolveSyncConflicts)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const choose = async (choice: 'mine' | 'theirs') => {
    setBusy(true)
    onClose()
    await resolve(choice)
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="github-dialog rpg-panel m-auto w-[min(34rem,calc(100vw-2rem))] bg-surface p-0 text-fg"
    >
      <div className="space-y-4 p-5">
        <h2 id={`${id}-title`} className="font-display text-xl font-bold tracking-wide text-fg">
          {t('github.conflict.title')}
        </h2>
        <p className="text-sm leading-relaxed text-fg-muted">{t('github.conflict.body')}</p>

        <ul className="space-y-2">
          {conflicts.map((c) => (
            <li key={`${c.path}:${c.keyPath.join('.')}`} className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
              <p className="font-semibold text-fg">
                {(c.path.split('/').pop() ?? c.path).replace(/\.md$/i, '')} <span className="font-mono text-xs font-normal text-fg-muted">{c.keyPath.join('.')}</span>
              </p>
              <p className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 font-num text-xs">
                <span className="text-fg-muted">{t('github.conflict.theirs')}</span>
                <span className="break-all text-fg">{c.fileGone ? t('github.conflict.fileGone') : formatValue(c.theirs)}</span>
                <span className="text-fg-muted">{t('github.conflict.mine')}</span>
                <span className="break-all text-trim">{formatValue(c.mine)}</span>
              </p>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={() => void choose('mine')} className="rpg-button text-left">
            {t('github.conflict.keepMine')}
            <span className="mt-0.5 block font-sans text-[0.65rem] font-normal normal-case tracking-normal opacity-85">{t('github.conflict.keepMineHint')}</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void choose('theirs')}
            className="rounded-md border border-trim/40 px-3 py-1.5 text-left text-sm font-medium text-fg transition hover:bg-trim/10"
          >
            {t('github.conflict.useTheirs')}
            <span className="mt-0.5 block text-[0.65rem] font-normal text-fg-muted">{t('github.conflict.useTheirsHint')}</span>
          </button>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg">
            {t('github.conflict.later')}
          </button>
        </div>
      </div>
    </dialog>
  )
}

const CLOUD = 'M7 19a5 5 0 0 1-.6-9.96A6.5 6.5 0 0 1 18.8 9.6 4.75 4.75 0 0 1 17.5 19Z'

/** The cloud, with a mark inside telling where the edits stand. */
function CloudIcon({ state }: { state: SyncStatus['state'] }) {
  const mark: Record<SyncStatus['state'], ReactNode> = {
    synced: <path d="m9.5 13.8 1.9 1.9 3.6-3.6" />,
    pending: <path d="M12 16.5v-5m-2.3 2.2L12 11.4l2.3 2.3" />,
    syncing: <path className="origin-[12px_14px] animate-spin" d="M14.4 14a2.4 2.4 0 1 1-.9-1.9" />,
    error: <path d="M12 11.5v2.6m0 2.2h.01" />,
    conflict: <path d="M10 11.5v5m4-5v5m-4-2.5h4" />,
  }
  return (
    <svg viewBox="0 0 24 24" className="size-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={CLOUD} />
      {mark[state]}
    </svg>
  )
}

/**
 * The GitHub half of the header's edit pill: a cloud showing where the vault's edits stand — saved,
 * waiting (with a count; click: save now), saving, failed (click: retry) or in conflict (click:
 * resolve). The words are in its tooltip, to keep the header narrow.
 */
export function SyncSegment({ className = '' }: { className?: string }) {
  const t = useT()
  const sync = useVaultStore((s) => s.sync)
  const syncNow = useVaultStore((s) => s.syncNow)
  const [showConflicts, setShowConflicts] = useState(false)
  if (!sync) return null

  const view: Record<SyncStatus['state'], { label: string; hint?: string; color: string; onClick?: () => void }> = {
    synced: { label: t('github.sync.synced'), hint: t('github.sync.syncedTooltip'), color: 'text-success' },
    pending: {
      label: t('github.sync.pending', { n: sync.state === 'pending' ? sync.count : 0 }),
      hint: t('github.sync.pendingTooltip'),
      color: 'text-trim hover:bg-trim/10',
      onClick: () => void syncNow(),
    },
    syncing: { label: t('github.sync.syncing'), color: 'text-fg-muted' },
    error: {
      label: t('github.sync.error'),
      hint: sync.state === 'error' && sync.kind ? t(`github.error.${sync.kind}`) : t('github.sync.failedHint'),
      color: 'bg-danger/10 text-danger hover:bg-danger/20',
      onClick: () => void syncNow(),
    },
    conflict: { label: t('github.sync.conflict'), hint: t('github.conflict.body'), color: 'bg-warning/10 text-warning hover:bg-warning/20', onClick: () => setShowConflicts(true) },
  }
  const { label, hint, color, onClick } = view[sync.state]
  const content = (
    <>
      <CloudIcon state={sync.state} />
      {sync.state === 'pending' && <span className="font-num text-xs font-bold">{sync.count}</span>}
    </>
  )
  const classes = `flex items-center gap-1 px-2.5 transition ${color} ${className}`
  const title = hint ? `${label} — ${hint}` : label

  return (
    <>
      {onClick ? (
        <button type="button" onClick={onClick} title={title} aria-label={label} className={classes}>
          {content}
        </button>
      ) : (
        <span role="status" title={title} aria-label={label} className={classes}>
          {content}
        </span>
      )}
      {showConflicts && sync.state === 'conflict' && <ConflictDialog conflicts={sync.conflicts} onClose={() => setShowConflicts(false)} />}
    </>
  )
}
