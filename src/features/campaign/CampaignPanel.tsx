import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { VaultIndexProvider } from '../../components/obsidian/VaultIndexContext'
import { useI18n } from '../../i18n/useI18n'
import { formatRelativeTime } from '../../i18n/relativeTime'
import { useVaultStore } from '../../store/vaultStore'
import { currentSession, newJournalId } from '../../vault/adapters/journal'
import type { JournalEntry, JournalKind } from '../../vault/types'
import { linksToText } from '../../vault/wikilinkSyntax'
import { DmSealIcon, JournalKindIcon, RefreshIcon } from '../journal/journalKinds'
import { EntryEditor, JournalTimeline, KindFilter, QuestTracker, type EntryHandlers } from '../journal/JournalParts'
import { useJumpToEntry } from '../journal/useJumpToEntry'
import { countSessions, filterEntries, journalLocale, KIND_LABEL, KIND_STYLE, SHOW_ALL, todayIso, updateEntry, type JournalFilter } from '../journal/journalView'
import { useCampaignRefresh, useCampaignRole, useFreshEntries, type CampaignRole } from './useCampaign'

/** "Spielleiter | Spieler": which side of the screen the DM looks at. */
function RoleSwitch({ role }: { role: CampaignRole }) {
  const { t } = useI18n()
  return (
    <div role="radiogroup" aria-label={t('campaign.view')} className="campaign-role">
      {(
        [
          [true, t('campaign.viewDm')],
          [false, t('campaign.viewPlayer')],
        ] as const
      ).map(([lead, label]) => (
        <button key={label} type="button" role="radio" aria-checked={role.leading === lead} onClick={() => role.setLeading(lead)}>
          {lead && <DmSealIcon className="size-3.5" />}
          {label}
        </button>
      ))}
    </div>
  )
}

/** When the journal was last compared with the repository / the folder, and a button to look now. */
function RefreshStatus({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  const { t, lang } = useI18n()
  const checkedAt = useVaultStore((s) => s.campaignCheckedAt)
  const live = useVaultStore((s) => s.github !== null || s.rootHandle !== null)
  // Re-render now and then, so "a minute ago" keeps up.
  const [, tick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(timer)
  }, [])
  if (!live) return null
  return (
    <button type="button" onClick={onRefresh} disabled={refreshing} className="campaign-refresh" title={t('campaign.refreshHint')}>
      <RefreshIcon className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
      {refreshing ? t('campaign.refreshing') : checkedAt ? t('campaign.checked', { when: formatRelativeTime(checkedAt, lang) }) : t('campaign.refresh')}
    </button>
  )
}

/** The campaign's banner: its seal and name, who keeps it, and the numbers of the story so far. */
function CampaignHero({ entries, role, refresh }: { entries: JournalEntry[]; role: CampaignRole; refresh: ReturnType<typeof useCampaignRefresh> }) {
  const { t } = useI18n()
  const campaign = useVaultStore((s) => s.vault.campaign)
  const vaultName = useVaultStore((s) => s.vaultName)
  const count = (kind: JournalKind) => entries.filter((e) => e.kind === kind).length
  const stats = [
    { label: t('journal.statSessions'), value: countSessions(entries) },
    { label: t('campaign.statOpenQuests'), value: entries.filter((e) => e.kind === 'quest' && !e.done).length },
    { label: t('campaign.statPeople'), value: count('npc') },
    { label: t('campaign.statPlaces'), value: count('place') },
  ]
  const dms = campaign?.dms ?? []

  return (
    <section className="campaign-hero rpg-panel">
      <div className="campaign-hero-glow" aria-hidden />
      <div className="relative flex flex-wrap items-center gap-4">
        <span className="campaign-seal" aria-hidden>
          <DmSealIcon className="size-9" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="campaign-eyebrow">{t('campaign.tab')}</p>
          <h2 className="font-display text-xl font-bold tracking-wide text-fg sm:text-2xl">{campaign?.title ?? vaultName ?? t('campaign.tab')}</h2>
          <p className="mt-0.5 text-xs text-fg-muted">{dms.length > 0 ? t('campaign.keptBy', { names: dms.map((d) => `@${d}`).join(', ') }) : t('campaign.subtitle')}</p>
        </div>
        {role.mayLead && (
          <div className="w-full sm:w-auto">
            <RoleSwitch role={role} />
          </div>
        )}
      </div>

      <dl className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="campaign-stat">
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-fg-muted">
        <span className="truncate" title={campaign?.path}>
          {campaign?.create ? t('campaign.notCreated', { file: campaign.path }) : t('journal.savedTo', { file: campaign?.path ?? '' })}
        </span>
        <RefreshStatus refreshing={refresh.refreshing} onRefresh={refresh.refresh} />
      </div>
    </section>
  )
}

/**
 * One volume of the codex: every entry of a kind (the people met, places seen, treasures found) as a
 * compact list — newest first; a click jumps to the entry.
 */
function CodexIndex({ kind, title, entries, onJump }: { kind: JournalKind; title: string; entries: JournalEntry[]; onJump: (id: string) => void }) {
  const { t } = useI18n()
  const [all, setAll] = useState(false)
  const list = entries.filter((e) => e.kind === kind).reverse()
  if (list.length === 0) return null
  const shown = all ? list : list.slice(0, 6)
  return (
    <Card title={title} aside={<span className="journal-count">{list.length}</span>}>
      <ul className="space-y-1">
        {shown.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onJump(e.id)} className="campaign-codex-row">
              <span className={`campaign-codex-medal ${KIND_STYLE[kind].tint}`}>
                <JournalKindIcon kind={kind} className={`size-3.5 ${KIND_STYLE[kind].text}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-fg">{e.title ?? e.text}</span>
                {e.title && e.text && <span className="block truncate text-[0.7rem] text-fg-muted">{linksToText(e.text).replace(/[*_`]/g, '')}</span>}
              </span>
              {e.session !== undefined && <span className="font-numeric text-[0.7rem] text-fg-muted">{e.session}</span>}
            </button>
          </li>
        ))}
      </ul>
      {list.length > shown.length && (
        <button type="button" onClick={() => setAll(true)} className="journal-link mt-2 text-xs">
          {t('campaign.showAll', { n: list.length })}
        </button>
      )}
    </Card>
  )
}

/** Lets the first account with push access become the campaign's DM, while nobody is. */
function ClaimCard() {
  const { t } = useI18n()
  const login = useVaultStore((s) => s.githubLogin)
  const claim = useVaultStore((s) => s.claimCampaign)
  return (
    <div className="campaign-claim">
      <DmSealIcon className="size-8 shrink-0 text-violet-400" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold tracking-wide text-fg">{t('campaign.claimTitle')}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{t('campaign.claimBody', { login: `@${login ?? ''}` })}</p>
      </div>
      <button type="button" onClick={() => void claim()} className="journal-submit">
        {t('campaign.claim')}
      </button>
    </div>
  )
}

/**
 * The campaign journal tab on the party page: the DM's book of the campaign (see
 * `adapters/campaignJournal.ts`) — quests, people, places and lore for the whole party. The DM writes
 * it here (with a composer like a character's journal, plus whom an entry is for); the players read it
 * here and, woven into their own notes, in every character's journal. A banner with the campaign's
 * numbers on top, the session timeline below, and the codex beside it: the quest board and indexes of
 * people, places and treasures.
 */
export function CampaignPanel() {
  const { t, lang } = useI18n()
  const locale = journalLocale(lang)
  const campaign = useVaultStore((s) => s.vault.campaign)
  const characters = useVaultStore((s) => s.vault.characters)
  const setCampaignJournal = useVaultStore((s) => s.setCampaignJournal)
  const role = useCampaignRole()
  const refresh = useCampaignRefresh()
  const entries = useMemo(() => campaign?.entries ?? [], [campaign?.entries])
  const [filter, setFilter] = useState<JournalFilter>(SHOW_ALL)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { flashId, jump } = useJumpToEntry(() => setFilter(SHOW_ALL))
  const isFresh = useFreshEntries(entries, !role.leading)
  const latestSession = currentSession(entries)
  const party = useMemo(() => characters.map((c) => c.frontmatter.name), [characters])

  const save = (next: JournalEntry[]) => void setCampaignJournal(next)
  const handlers: EntryHandlers = {
    canEdit: role.canWrite,
    locale,
    latestSession,
    editingId,
    flashId,
    setEditingId,
    change: (entry) => save(updateEntry(entries, entry.id, () => entry)),
    remove: (id) => save(updateEntry(entries, id, () => null)),
    isFresh,
    audienceOptions: party,
  }
  const shown = useMemo(() => filterEntries(entries, filter), [entries, filter])
  // `[[Links]]` in the entries resolve against the vault, as on a character's sheet.
  const index = useVaultStore((s) => s.index)

  return (
    <VaultIndexProvider index={index}>
      <div className="space-y-4">
        <CampaignHero entries={entries} role={role} refresh={refresh} />

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            {role.canClaim && <ClaimCard />}
            {role.canWrite ? (
              <Card title={t('campaign.newEntry')} className="campaign-composer">
                <EntryEditor
                  initial={{ kind: 'quest', text: '', session: latestSession ?? 1, date: todayIso() }}
                  latestSession={latestSession}
                  submitLabel={t('journal.save')}
                  audienceOptions={party}
                  onSubmit={(draft) => save([...entries, { ...draft, id: newJournalId() }])}
                />
              </Card>
            ) : (
              role.leading && <p className="rpg-note text-sm">{t('journal.readOnly')}</p>
            )}

            {entries.length > 0 && <KindFilter entries={entries} filter={filter} onChange={setFilter} placeholder={t('campaign.search')} />}

            {entries.length === 0 ? (
              <div className="rpg-empty">
                <DmSealIcon className="size-12 text-violet-400/70" />
                <p className="max-w-sm text-sm text-fg-muted">{role.leading ? t('campaign.emptyDm') : t('campaign.emptyPlayer')}</p>
              </div>
            ) : shown.length === 0 ? (
              <p className="py-8 text-center text-sm text-fg-muted">{t('journal.emptyFiltered')}</p>
            ) : (
              <JournalTimeline entries={shown} h={handlers} />
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4">
            <QuestTracker title={t('campaign.questBoard')} entries={entries} canEdit={role.canWrite} onToggle={handlers.change} onJump={jump} />
            <CodexIndex kind="npc" title={t('campaign.people')} entries={entries} onJump={jump} />
            <CodexIndex kind="place" title={t('campaign.places')} entries={entries} onJump={jump} />
            <CodexIndex kind="loot" title={t('campaign.treasures')} entries={entries} onJump={jump} />
            <CodexIndex kind="lore" title={t(KIND_LABEL.lore)} entries={entries} onJump={jump} />
          </aside>
        </div>
      </div>
    </VaultIndexProvider>
  )
}
