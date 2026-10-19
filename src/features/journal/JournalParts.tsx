import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Card } from '../../components/Card'
import { renderObsidianBody } from '../../components/obsidian/renderObsidian'
import { useI18n } from '../../i18n/useI18n'
import { JOURNAL_KINDS, type JournalEntry, type JournalKind } from '../../vault/types'
import { CheckIcon, DmSealIcon, JournalKindIcon, PencilIcon, PinIcon, SearchIcon, TrashIcon } from './journalKinds'
import { countByKind, formatJournalDate, groupBySession, KIND_LABEL, KIND_STYLE, type JournalFilter } from './journalView'

/**
 * The pieces both journals are built from — a character's (`JournalPanel`) and the DM's campaign
 * journal (`features/campaign/CampaignPanel`): the composer, the entry cards on their session timeline,
 * the kind filter and the quest tracker.
 */

export type Draft = Pick<JournalEntry, 'kind' | 'title' | 'text' | 'session' | 'date' | 'audience'>

/** Whom a campaign entry is for: the whole party (nothing picked) or the characters picked. */
function AudiencePicker({ options, value, onChange }: { options: string[]; value: string[]; onChange: (value: string[]) => void }) {
  const { t } = useI18n()
  const toggle = (name: string) => onChange(value.includes(name) ? value.filter((n) => n !== name) : [...value, name])
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('campaign.audience')}>
      <span className="mr-0.5 text-xs text-fg-muted">{t('campaign.audience')}</span>
      <button type="button" aria-pressed={value.length === 0} onClick={() => onChange([])} className={`rpg-chip ${value.length === 0 ? 'campaign-chip-on' : ''}`}>
        {t('campaign.audienceAll')}
      </button>
      {options.map((name) => (
        <button key={name} type="button" aria-pressed={value.includes(name)} onClick={() => toggle(name)} className={`rpg-chip ${value.includes(name) ? 'campaign-chip-on' : ''}`}>
          {name.split(' ')[0]}
        </button>
      ))}
    </div>
  )
}

/**
 * Writes or edits one entry: what it's about (kind chips), an optional title, the text, and the session
 * and date it belongs to — with `audienceOptions`, also whom it's for. Built for typing at the table:
 * the text field has focus, Ctrl/⌘ + Enter saves, and after saving everything but the text stays put
 * for the next note.
 */
export function EntryEditor({
  initial,
  latestSession,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus = false,
  audienceOptions,
}: {
  initial: Draft
  latestSession: number | undefined
  submitLabel: string
  onSubmit: (draft: Draft) => void
  onCancel?: () => void
  autoFocus?: boolean
  audienceOptions?: string[]
}) {
  const { t } = useI18n()
  const [kind, setKind] = useState<JournalKind>(initial.kind)
  const [title, setTitle] = useState(initial.title ?? '')
  const [text, setText] = useState(initial.text)
  const [session, setSession] = useState(initial.session !== undefined ? String(initial.session) : '')
  const [date, setDate] = useState(initial.date ?? '')
  const [audience, setAudience] = useState<string[]>(initial.audience ?? [])
  const textRef = useRef<HTMLTextAreaElement>(null)
  const sessionId = useId()
  const dateId = useId()
  const empty = !title.trim() && !text.trim()

  useEffect(() => {
    if (autoFocus) textRef.current?.focus()
  }, [autoFocus])

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (empty) return
    const n = Number.parseInt(session, 10)
    onSubmit({
      kind,
      title: title.trim() || undefined,
      text: text.trim(),
      session: Number.isFinite(n) && n > 0 ? n : undefined,
      date: date || undefined,
      audience: audience.length > 0 ? audience : undefined,
    })
    if (!onCancel) {
      setTitle('')
      setText('')
      textRef.current?.focus()
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit()
    else if (event.key === 'Escape' && onCancel) onCancel()
  }

  return (
    <form onSubmit={submit} onKeyDown={onKeyDown} className="space-y-3">
      <div role="radiogroup" aria-label={t('journal.new')} className="flex flex-wrap gap-1.5">
        {JOURNAL_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`rpg-chip ${kind === k ? KIND_STYLE[k].tint : ''}`}
          >
            <JournalKindIcon kind={k} className={`size-4 ${KIND_STYLE[k].text}`} />
            {t(KIND_LABEL[k])}
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            textRef.current?.focus()
          }
        }}
        placeholder={t('journal.titlePlaceholder')}
        aria-label={t('journal.titlePlaceholder')}
        className="rpg-input w-full font-display text-sm tracking-wide"
      />
      <textarea
        ref={textRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('journal.textPlaceholder')}
        aria-label={t('journal.textPlaceholder')}
        rows={3}
        className="rpg-input journal-textarea w-full text-sm leading-relaxed"
      />

      {audienceOptions && audienceOptions.length > 0 && <AudiencePicker options={audienceOptions} value={audience} onChange={setAudience} />}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted">
        <label htmlFor={sessionId} className="flex items-center gap-1.5">
          {t('journal.sessionLabel')}
          <input
            id={sessionId}
            type="number"
            min={1}
            inputMode="numeric"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            className="rpg-input w-14 px-1.5 py-1 text-center font-numeric text-sm text-fg"
          />
        </label>
        {!onCancel && (
          <button type="button" onClick={() => setSession(String((latestSession ?? 0) + 1))} className="journal-link">
            + {t('journal.newSession')}
          </button>
        )}
        <label htmlFor={dateId} className="flex items-center gap-1.5">
          {t('journal.date')}
          <input id={dateId} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rpg-input px-1.5 py-1 text-sm text-fg" />
        </label>

        <div className="ml-auto flex items-center gap-2">
          {onCancel ? (
            <button type="button" onClick={onCancel} className="journal-link">
              {t('journal.cancel')}
            </button>
          ) : (
            <kbd className="hidden text-[0.7rem] text-fg-muted/80 sm:inline">{t('journal.saveShortcut')}</kbd>
          )}
          <button type="submit" disabled={empty} className="journal-submit">
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

/** An icon button that switches something on and off (a quest done, an entry pinned). */
function ToggleIconButton({ on, label, onClass, onToggle, children }: { on: boolean; label: string; onClass: string; onToggle: () => void; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={on} onClick={onToggle} className={`rpg-icon-btn ${on ? onClass : ''}`}>
      {children}
    </button>
  )
}

function EntryActions({
  entry,
  onChange,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry
  onChange: (entry: JournalEntry) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="journal-actions flex shrink-0 items-center gap-0.5">
      {entry.kind === 'quest' && (
        <ToggleIconButton on={Boolean(entry.done)} label={entry.done ? t('journal.reopen') : t('journal.markDone')} onClass="text-success" onToggle={() => onChange({ ...entry, done: !entry.done })}>
          <CheckIcon />
        </ToggleIconButton>
      )}
      <ToggleIconButton on={Boolean(entry.pinned)} label={entry.pinned ? t('journal.unpin') : t('journal.pin')} onClass="text-trim" onToggle={() => onChange({ ...entry, pinned: !entry.pinned })}>
        <PinIcon />
      </ToggleIconButton>
      <button type="button" title={t('journal.edit')} aria-label={t('journal.edit')} onClick={onEdit} className="rpg-icon-btn">
        <PencilIcon />
      </button>
      {confirming ? (
        <button type="button" onClick={onDelete} onBlur={() => setConfirming(false)} autoFocus className="rpg-icon-btn w-auto! px-2 text-xs text-danger">
          {t('journal.confirmDelete')}
        </button>
      ) : (
        <button type="button" title={t('journal.delete')} aria-label={t('journal.delete')} onClick={() => setConfirming(true)} className="rpg-icon-btn hover:text-danger">
          <TrashIcon />
        </button>
      )}
    </div>
  )
}

export interface EntryHandlers {
  /** Whether the viewer may change entries — never those from the campaign journal (`fromCampaign`). */
  canEdit: boolean
  locale: string
  latestSession: number | undefined
  editingId: string | null
  flashId: string | null
  setEditingId: (id: string | null) => void
  change: (entry: JournalEntry) => void
  remove: (id: string) => void
  /** Whether an entry is new to this device (gets a "new" ribbon). */
  isFresh?: (entry: JournalEntry) => boolean
  /** The party's names: the editor then asks whom an entry is for (campaign journal). */
  audienceOptions?: string[]
}

/** "For Aldric & Borin" — whom a campaign entry is meant for. */
function AudienceLine({ audience }: { audience: string[] }) {
  const { t } = useI18n()
  return (
    <span className="campaign-audience normal-case tracking-normal">
      {t('campaign.onlyFor', { names: audience.map((n) => n.split(' ')[0]).join(' & ') })}
    </span>
  )
}

/** One note on the timeline: a medallion in its kind's color on the line, the card beside it. DM entries wear a seal. */
function EntryCard({ entry, showSession, h }: { entry: JournalEntry; showSession?: boolean; h: EntryHandlers }) {
  const { t } = useI18n()
  const style = KIND_STYLE[entry.kind]
  const editing = h.editingId === entry.id
  const fresh = h.isFresh?.(entry) ?? false
  const editable = h.canEdit && !entry.fromCampaign

  return (
    <li
      id={`journal-${entry.id}`}
      className={`journal-entry group relative ${h.flashId === entry.id ? 'journal-flash' : ''} ${entry.fromCampaign ? 'journal-entry-dm' : ''} ${fresh ? 'journal-entry-fresh' : ''}`}
    >
      <span aria-hidden className={`journal-node ${style.tint}`}>
        <JournalKindIcon kind={entry.kind} className={`size-4 ${style.text}`} />
      </span>
      <article className={`journal-card border-l-4 ${style.edge} ${entry.done ? 'opacity-70' : ''}`}>
        {fresh && <span className="journal-fresh-ribbon">{t('campaign.new')}</span>}
        {editing ? (
          <EntryEditor
            initial={entry}
            latestSession={h.latestSession}
            submitLabel={t('journal.update')}
            autoFocus
            audienceOptions={h.audienceOptions}
            onCancel={() => h.setEditingId(null)}
            onSubmit={(draft) => {
              h.change({ ...entry, ...draft })
              h.setEditingId(null)
            }}
          />
        ) : (
          <>
            <header className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {entry.title && (
                  <h3 className={`font-display text-sm font-bold tracking-wide text-fg ${entry.done ? 'line-through decoration-trim/60' : ''}`}>{entry.title}</h3>
                )}
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.7rem] uppercase tracking-[0.12em] text-fg-muted">
                  {entry.fromCampaign && (
                    <span className="campaign-badge" title={t('campaign.fromDmHint')}>
                      <DmSealIcon className="size-3.5" />
                      {t('campaign.fromDm')}
                    </span>
                  )}
                  <span className={style.text}>{t(KIND_LABEL[entry.kind])}</span>
                  {entry.done && <span className="text-success">✓ {t('journal.done')}</span>}
                  {showSession && entry.session !== undefined && <span>{t('journal.sessionN', { n: entry.session })}</span>}
                  {entry.date && <span className="normal-case tracking-normal">{formatJournalDate(entry.date, h.locale)}</span>}
                  {entry.audience && entry.audience.length > 0 && <AudienceLine audience={entry.audience} />}
                </p>
              </div>
              {editable && <EntryActions entry={entry} onChange={h.change} onEdit={() => h.setEditingId(entry.id)} onDelete={() => h.remove(entry.id)} />}
            </header>
            {entry.text && <div className="mt-2 text-sm leading-relaxed text-fg/90 [overflow-wrap:anywhere]">{renderObsidianBody(entry.text)}</div>}
          </>
        )}
      </article>
    </li>
  )
}

export function KindFilter({
  entries,
  filter,
  onChange,
  placeholder,
  children,
}: {
  entries: JournalEntry[]
  filter: JournalFilter
  onChange: (filter: JournalFilter) => void
  placeholder?: string
  /** More chips after the kinds (e.g. showing the campaign journal's entries or not). */
  children?: ReactNode
}) {
  const { t } = useI18n()
  const counts = countByKind(entries)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={filter.kind === 'all'} onClick={() => onChange({ ...filter, kind: 'all' })} className={`rpg-chip ${filter.kind === 'all' ? 'rpg-chip-on' : ''}`}>
          {t('journal.all')} <span className="journal-count">{entries.length}</span>
        </button>
        {JOURNAL_KINDS.filter((k) => counts[k] || filter.kind === k).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter.kind === k}
            onClick={() => onChange({ ...filter, kind: filter.kind === k ? 'all' : k })}
            className={`rpg-chip ${filter.kind === k ? KIND_STYLE[k].tint : ''}`}
          >
            <JournalKindIcon kind={k} className={`size-3.5 ${KIND_STYLE[k].text}`} />
            {t(KIND_LABEL[k])} <span className="journal-count">{counts[k] ?? 0}</span>
          </button>
        ))}
        {children}
      </div>
      <label className="relative ml-auto min-w-44 flex-1 sm:max-w-64">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-muted" />
        <input
          type="search"
          value={filter.query}
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
          placeholder={placeholder ?? t('journal.search')}
          aria-label={placeholder ?? t('journal.search')}
          className="rpg-input w-full py-1.5 pl-8 text-sm"
        />
      </label>
    </div>
  )
}

/**
 * Open quests as a checklist, like a game's quest tracker; a click on one jumps to its entry. The DM's
 * quests carry the seal — only the DM ticks them off, in the campaign journal.
 */
export function QuestTracker({
  entries,
  canEdit,
  onToggle,
  onJump,
  title,
}: {
  entries: JournalEntry[]
  canEdit: boolean
  onToggle: (entry: JournalEntry) => void
  onJump: (id: string) => void
  title?: string
}) {
  const { t } = useI18n()
  const quests = entries.filter((e) => e.kind === 'quest')
  const open = quests.filter((q) => !q.done).reverse()
  const done = quests.length - open.length
  return (
    <Card title={title ?? t('journal.tracker')}>
      {open.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('journal.trackerEmpty')}</p>
      ) : (
        <ul className="space-y-1.5">
          {open.map((q) => (
            <li key={q.id} className="flex items-start gap-2">
              <button
                type="button"
                disabled={!canEdit || q.fromCampaign}
                aria-label={t('journal.markDone')}
                onClick={() => onToggle({ ...q, done: true })}
                className={`journal-quest-box mt-0.5 ${q.fromCampaign ? 'journal-quest-box-dm' : ''}`}
              >
                <CheckIcon className="size-3.5 opacity-0" />
              </button>
              <button type="button" onClick={() => onJump(q.id)} className="min-w-0 flex-1 cursor-pointer text-left text-sm text-fg hover:text-trim">
                <span className="line-clamp-2">{q.title ?? q.text}</span>
                <span className="flex items-center gap-1.5 text-[0.7rem] text-fg-muted">
                  {q.fromCampaign && <DmSealIcon className="size-3 text-violet-400" />}
                  {q.session !== undefined && t('journal.sessionN', { n: q.session })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {done > 0 && <p className="mt-3 border-t border-trim/15 pt-2 text-xs text-fg-muted">✓ {t('journal.trackerDone', { n: done })}</p>}
    </Card>
  )
}

/** The entries shown: pinned ones first, then one timeline per session, newest first. */
export function JournalTimeline({ entries, h }: { entries: JournalEntry[]; h: EntryHandlers }) {
  const { t } = useI18n()
  const pinned = entries.filter((e) => e.pinned).reverse()
  const groups = groupBySession(entries.filter((e) => !e.pinned))
  return (
    <>
      {pinned.length > 0 && (
        <section aria-label={t('journal.pinned')}>
          <h3 className="journal-session-title mb-3">
            <PinIcon className="size-4 text-trim" />
            {t('journal.pinned')}
          </h3>
          <ol className="journal-timeline">
            {pinned.map((e) => (
              <EntryCard key={e.id} entry={e} showSession h={h} />
            ))}
          </ol>
        </section>
      )}
      {groups.map((g) => {
        const label = g.session !== undefined ? t('journal.sessionN', { n: g.session }) : t('journal.noSession')
        return (
          <section key={g.session ?? 'none'} aria-label={label}>
            <h3 className="journal-session-title mb-3">
              {g.session !== undefined && <span className="journal-session-medal">{g.session}</span>}
              <span>{label}</span>
              {g.from && (
                <span className="text-[0.7rem] font-normal tracking-normal text-fg-muted normal-case">
                  {formatJournalDate(g.from, h.locale)}
                  {g.to && g.to !== g.from && ` – ${formatJournalDate(g.to, h.locale)}`}
                </span>
              )}
              <span aria-hidden className="h-px flex-1 bg-linear-to-r from-trim/40 to-transparent" />
            </h3>
            <ol className="journal-timeline">
              {g.entries.map((e) => (
                <EntryCard key={e.id} entry={e} h={h} />
              ))}
            </ol>
          </section>
        )
      })}
    </>
  )
}
