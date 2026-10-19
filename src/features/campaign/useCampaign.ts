import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCanEdit } from '../../store/canEdit'
import { useIsCampaignDm, useVaultStore } from '../../store/vaultStore'
import { readStored, writeStored } from '../../utils/storage'
import { gitHubVaultKey } from '../../vault/github/githubApi'
import type { JournalEntry } from '../../vault/types'
import { entryMark, loadSeen, saveSeen, unseenEntries } from './campaignSeen'

/** Identifies the open vault for per-device settings: the repository, the folder's name, or the demo. */
export function useVaultKey(): string {
  return useVaultStore((s) => (s.github ? `gh:${gitHubVaultKey(s.github)}` : s.source === 'sample' ? 'sample' : `dir:${s.vaultName ?? ''}`))
}

const LEAD_KEY = 'dnd-companion-campaign-lead:'

function storedLead(vaultKey: string): boolean | null {
  const raw = readStored(LEAD_KEY + vaultKey)
  return raw === null ? null : raw === '1'
}

export interface CampaignRole {
  /** May act as the DM here: a GitHub account listed in `dm:`, or anyone with a local folder or the demo. */
  mayLead: boolean
  /** The DM's view is on (else the players' — a DM can preview what they see). */
  leading: boolean
  setLeading: (on: boolean) => void
  /** Writing the campaign journal is possible right now (DM view on, editing switched on). */
  canWrite: boolean
  /** A GitHub vault whose campaign has no DM yet, opened by an account that may push: it can claim it. */
  canClaim: boolean
}

/**
 * Who writes the campaign journal on this device. In a GitHub vault the `dm:` list decides — the app
 * knows the account. A local folder has no accounts (everyone there can edit the note in Obsidian
 * anyway), so whoever runs the table switches to the DM's view on their device; the choice is remembered
 * per vault. Either way it is a convenience, not a lock: see `adapters/campaignJournal.ts`.
 */
export function useCampaignRole(): CampaignRole {
  const vaultKey = useVaultKey()
  const isGitHub = useVaultStore((s) => s.github !== null)
  const hasWriter = useVaultStore((s) => s.writer !== null)
  const noDm = useVaultStore((s) => (s.vault.campaign?.dms.length ?? 0) === 0)
  const login = useVaultStore((s) => s.githubLogin)
  const isDm = useIsCampaignDm()
  const canEdit = useCanEdit()

  const mayLead = isGitHub ? isDm : hasWriter
  const [lead, setLead] = useState(() => ({ vaultKey, on: storedLead(vaultKey) }))
  const stored = lead.vaultKey === vaultKey ? lead.on : storedLead(vaultKey)
  // A listed DM starts in the DM's view; at a shared folder, everyone starts as a player.
  const leading = mayLead && (stored ?? isGitHub)

  const setLeading = useCallback(
    (on: boolean) => {
      setLead({ vaultKey, on })
      writeStored(LEAD_KEY + vaultKey, on ? '1' : '0')
    },
    [vaultKey],
  )

  return { mayLead, leading, setLeading, canWrite: leading && canEdit, canClaim: isGitHub && noDm && login !== null && canEdit }
}

/** How often an open journal looks for the DM's new entries. */
const REFRESH_MS = 60_000

/**
 * Keeps the campaign journal current while a view showing it is open: re-read on opening, whenever the
 * window comes back into focus, and every minute while it's visible. One small request to GitHub (the
 * branch head; the note itself only when it changed) or one file read from disk.
 */
export function useCampaignRefresh(): { refreshing: boolean; refresh: () => void } {
  const refreshCampaign = useVaultStore((s) => s.refreshCampaign)
  const [refreshing, setRefreshing] = useState(false)
  const busy = useRef(false)

  const refresh = useCallback(() => {
    if (busy.current) return
    busy.current = true
    setRefreshing(true)
    void refreshCampaign().finally(() => {
      busy.current = false
      setRefreshing(false)
    })
  }, [refreshCampaign])

  useEffect(() => {
    refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const timer = setInterval(onVisible, REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refresh])

  return { refreshing, refresh }
}

/**
 * The campaign entries that are new to this device, marking every shown entry as seen. They stay
 * highlighted while the view is open — also those a refresh brings in meanwhile. Off (`track` false)
 * for the DM's own view, where their own writing would otherwise light up.
 */
export function useFreshEntries(entries: JournalEntry[], track: boolean): (entry: JournalEntry) => boolean {
  const vaultKey = useVaultKey()
  const all = useVaultStore((s) => s.vault.campaign?.entries)
  // What had been seen when the view opened: anything else is new for as long as it stays open.
  const [baseline, setBaseline] = useState(() => ({ vaultKey, seen: loadSeen(vaultKey) }))
  if (baseline.vaultKey !== vaultKey) setBaseline({ vaultKey, seen: loadSeen(vaultKey) })

  useEffect(() => {
    // Kept to the entries that still exist, so edited and deleted ones don't pile up.
    const current = new Set((all ?? entries).map(entryMark))
    saveSeen(vaultKey, new Set([...(loadSeen(vaultKey) ?? []), ...entries.map(entryMark)].filter((m) => current.has(m))))
  }, [vaultKey, entries, all])

  const fresh = useMemo(() => new Set(track ? unseenEntries(entries, baseline.seen).map(entryMark) : []), [entries, baseline.seen, track])
  return useCallback((entry: JournalEntry) => fresh.has(entryMark(entry)), [fresh])
}

/** How many campaign entries this device hasn't shown yet — for the tab's badge. Read on every render:
 * a visit to the campaign tab marks entries as seen without the entries changing. */
export function useUnseenCount(entries: JournalEntry[]): number {
  return unseenEntries(entries, loadSeen(useVaultKey())).length
}
