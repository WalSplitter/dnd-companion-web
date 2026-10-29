import { useMemo, useState } from 'react'
import { Card } from '../../components/Card'
import { useI18n } from '../../i18n/useI18n'
import { useCanEdit } from '../../store/canEdit'
import { useVaultStore } from '../../store/vaultStore'
import { readStored, writeStored } from '../../utils/storage'
import { isFor } from '../../vault/adapters/campaignJournal'
import { currentSession, newJournalId } from '../../vault/adapters/journal'
import type { CharacterFrontmatter, JournalEntry } from '../../vault/types'
import { useCampaignRefresh, useFreshEntries } from '../campaign/useCampaign'
import { DmSealIcon, JournalKindIcon } from './journalKinds'
import { EntryEditor, JournalTimeline, KindFilter, QuestTracker, type EntryHandlers } from './JournalParts'
import { useJumpToEntry } from './useJumpToEntry'
import { countSessions, filterEntries, journalLocale, SHOW_ALL, todayIso, updateEntry, type JournalFilter } from './journalView'

function Chronicle({ entries }: { entries: JournalEntry[] }) {
  const { t } = useI18n()
  const openQuests = entries.filter((e) => e.kind === 'quest' && !e.done).length
  const stats = [
    { label: t('journal.statSessions'), value: countSessions(entries) },
    { label: t('journal.statEntries'), value: entries.length },
    { label: t('journal.statOpenQuests'), value: openQuests },
  ]
  return (
    <Card title={t('journal.chronicle')}>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse gap-1 rounded-md border border-trim/20 bg-surface-2/60 px-1 py-2">
            <dt className="text-[0.65rem] tracking-[0.1em] text-fg-muted uppercase">{s.label}</dt>
            <dd className="font-numeric text-2xl leading-none font-bold text-fg">{s.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

/** Whether the DM's entries show in a character's journal — per device, on unless switched off. */
const SHOW_CAMPAIGN_KEY = 'dnd-companion-journal-show-campaign'

function useShowCampaign(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => readStored(SHOW_CAMPAIGN_KEY) !== '0')
  return [
    on,
    (next) => {
      setOn(next)
      writeStored(SHOW_CAMPAIGN_KEY, next ? '1' : '0')
    },
  ]
}

const NO_ENTRIES: JournalEntry[] = []

/**
 * The Journal tab: the player's own notes from the table, saved to the vault (see
 * `adapters/journal.ts`), woven together with what the DM wrote in the campaign journal for the whole
 * party or this character — those carry the DM's seal and stay read-only here. A quick composer on top,
 * then the notes as a timeline grouped by session — newest first, pinned ones above — with kind filters
 * and search; beside it the chronicle's numbers and a tracker of the open quests.
 */
export function JournalPanel({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const { t, lang } = useI18n()
  const locale = journalLocale(lang)
  const canEdit = useCanEdit()
  const setJournal = useVaultStore((s) => s.setJournal)
  const campaign = useVaultStore((s) => s.vault.campaign)
  const own = useMemo(() => character.journal ?? [], [character.journal])
  const [filter, setFilter] = useState<JournalFilter>(SHOW_ALL)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCampaign, setShowCampaign] = useShowCampaign()
  const { flashId, jump } = useJumpToEntry(() => setFilter(SHOW_ALL))
  useCampaignRefresh()

  const fromDm = useMemo(
    () => (campaign?.entries ?? []).filter((e) => isFor(e, character.name)).map((e) => ({ ...e, fromCampaign: true })),
    [campaign?.entries, character.name],
  )
  // Only what's actually shown counts as seen — hidden, the DM's entries stay new for the campaign tab.
  const isFresh = useFreshEntries(showCampaign ? fromDm : NO_ENTRIES, true)
  // Both journals in one timeline, oldest first — by session; unnumbered notes keep their place.
  const entries = useMemo(() => {
    if (!showCampaign || fromDm.length === 0) return own
    const bySession = (e: JournalEntry) => e.session ?? Number.POSITIVE_INFINITY
    return [...fromDm, ...own].sort((a, b) => bySession(a) - bySession(b))
  }, [own, fromDm, showCampaign])
  const latestSession = currentSession([...own, ...fromDm])

  const save = (next: JournalEntry[]) => void setJournal(characterPath, next)
  const handlers: EntryHandlers = {
    canEdit,
    locale,
    latestSession,
    editingId,
    flashId,
    setEditingId,
    change: (entry) => save(updateEntry(own, entry.id, () => entry)),
    remove: (id) => save(updateEntry(own, id, () => null)),
    isFresh: (e) => Boolean(e.fromCampaign) && isFresh(e),
  }

  const shown = useMemo(() => filterEntries(entries, filter), [entries, filter])
  const file = character._write?.journal?.path.split('/').pop()

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] wide:grid-cols-[minmax(0,4fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        {canEdit ? (
          <Card title={t('journal.new')}>
            <EntryEditor
              initial={{ kind: 'note', text: '', session: latestSession ?? 1, date: todayIso() }}
              latestSession={latestSession}
              submitLabel={t('journal.save')}
              onSubmit={(draft) => save([...own, { ...draft, audience: undefined, id: newJournalId() }])}
            />
          </Card>
        ) : (
          <p className="rpg-note text-sm">{t('journal.readOnly')}</p>
        )}

        {(entries.length > 0 || fromDm.length > 0) && (
          <KindFilter entries={entries} filter={filter} onChange={setFilter}>
            {fromDm.length > 0 && (
              <button
                type="button"
                aria-pressed={showCampaign}
                onClick={() => setShowCampaign(!showCampaign)}
                title={t('campaign.showInJournalHint')}
                className={`rpg-chip ${showCampaign ? 'campaign-chip-on' : ''}`}
              >
                <DmSealIcon className="size-3.5 text-violet-400" />
                {t('campaign.tab')} <span className="journal-count">{fromDm.length}</span>
              </button>
            )}
          </KindFilter>
        )}

        {entries.length === 0 ? (
          <div className="rpg-empty">
            <JournalKindIcon kind="lore" className="size-10 text-trim/70" />
            <p className="max-w-sm text-sm text-fg-muted">{t('journal.empty')}</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">{t('journal.emptyFiltered')}</p>
        ) : (
          // Very wide screens: the sessions run in columns, newest first, each kept whole with its heading
          <div className="space-y-4 wide:block wide:columns-[28rem] wide:gap-x-8 [&>section]:break-inside-avoid">

            <JournalTimeline entries={shown} h={handlers} />
          </div>
        )}
        {file && own.length > 0 && <p className="text-right text-[0.7rem] text-fg-muted/80">{t('journal.savedTo', { file })}</p>}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4">
        <Chronicle entries={entries} />
        <QuestTracker entries={entries} canEdit={canEdit} onToggle={handlers.change} onJump={jump} />
      </aside>
    </div>
  )
}
