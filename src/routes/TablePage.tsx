import type { Item } from '@owlbear-rodeo/sdk'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Card } from '../components/Card'
import { useT } from '../i18n/useI18n'
import { ConditionsEditor } from '../owlbear/ConditionsEditor'
import { formatExtras, formatInitiative, formatPools } from '../owlbear/formatVitals'
import { readLink, vitalsOf } from '../owlbear/live'
import { cancelLoot, clearInitiative, linkToken, pushVitals, removeVitals, sendLoot, unlinkToken } from '../owlbear/liveSync'
import { useOwlbearStore } from '../owlbear/owlbearStore'
import { byInitiative } from '../owlbear/table'
import { useSelectedToken } from '../owlbear/useSelectedToken'
import { useVaultStore } from '../store/vaultStore'
import { characterRoute } from './paths'

const BUTTON = 'rounded-md border border-trim/40 px-3 py-1.5 text-sm font-medium text-fg transition hover:border-trim hover:bg-trim/10 disabled:opacity-50'

/** Copies `text`. Owlbear's frame doesn't grant the Clipboard API, but the old copy command still
 * works from a click. False when neither does. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.cssText = 'position:fixed;opacity:0'
    document.body.append(area)
    area.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      area.remove()
    }
  }
}

/** Everything Owlbear keeps about a token, so the data of other extensions (Clash) can be read off. */
function TokenInspector({ item }: { item: Item }) {
  const t = useT()
  const [copied, setCopied] = useState<'yes' | 'manual' | null>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const json = JSON.stringify({ name: item.name, layer: item.layer, metadata: item.metadata }, null, 2)

  const copy = async () => {
    if (await copyText(json)) {
      setCopied('yes')
      setTimeout(() => setCopied(null), 1500)
      return
    }
    // Last resort: select the text, so Ctrl+C takes it.
    if (preRef.current) window.getSelection()?.selectAllChildren(preRef.current)
    setCopied('manual')
  }

  return (
    <details className="mt-4 rounded-lg border border-trim/20 px-3 py-2">
      <summary className="cursor-pointer text-sm text-fg-muted">{t('owlbear.inspector')}</summary>
      <button type="button" className={`${BUTTON} mt-2`} onClick={() => void copy()}>
        {copied === 'yes' ? t('owlbear.copied') : t('owlbear.copy')}
      </button>
      {copied === 'manual' && <p className="mt-2 text-xs text-warning">{t('owlbear.copyManually')}</p>}
      <pre ref={preRef} className="mt-2 max-h-80 overflow-auto rounded-md bg-surface-2 p-2 text-xs text-fg">
        {json}
      </pre>
    </details>
  )
}

/** Links one token to a character of the vault — keyed by the token, so a new selection starts afresh. */
function TokenLinker({ item }: { item: Item }) {
  const t = useT()
  const characters = useVaultStore((s) => s.vault.characters)
  const link = readLink(item.metadata)
  const [choice, setChoice] = useState('')
  const [busy, setBusy] = useState(false)
  const chosen = characters.find((c) => c.frontmatter.name === (choice || link?.character))
  const selectRef = useRef<HTMLSelectElement>(null)
  const { hash, key } = useLocation()
  const navigate = useNavigate()

  // Opened from the token's context menu ("Link to a character"): straight to the choice.
  useEffect(() => {
    if (hash !== `#link=${encodeURIComponent(item.id)}`) return
    selectRef.current?.scrollIntoView({ block: 'center' })
    selectRef.current?.focus()
    navigate('/table', { replace: true })
  }, [hash, key, item.id, navigate])

  const run = (action: () => Promise<void>) => {
    setBusy(true)
    void action().finally(() => setBusy(false))
  }

  return (
    <>
      <p className="font-display text-lg font-bold text-fg">{item.name}</p>
      <p className={`text-sm ${link ? 'text-success' : 'text-fg-muted'}`}>{link ? t('owlbear.linkedTo', { name: link.character }) : t('owlbear.notLinked')}</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-fg-muted">
          {t('owlbear.chooseCharacter')}
          <select
            ref={selectRef}
            value={choice || link?.character || ''}
            onChange={(e) => setChoice(e.target.value)}
            className="rounded-md border border-trim/40 bg-surface px-2 py-1.5 text-sm text-fg"
          >
            <option value="" disabled>
              —
            </option>
            {characters.map((c) => (
              <option key={c.path} value={c.frontmatter.name}>
                {c.frontmatter.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={BUTTON}
          disabled={busy || !chosen || chosen.frontmatter.name === link?.character}
          onClick={() => chosen && run(() => linkToken(item.id, chosen.frontmatter))}
        >
          {t('owlbear.link')}
        </button>
        {link && (
          <button type="button" className={BUTTON} disabled={busy} onClick={() => run(() => unlinkToken(item.id))}>
            {t('owlbear.unlink')}
          </button>
        )}
        {link && characters.some((c) => c.frontmatter.name === link.character) && (
          <Link to={characterRoute(link.character)} className={BUTTON}>
            {t('owlbear.openSheet')}
          </Link>
        )}
      </div>
      {link && (
        <div className="mt-3">
          <ConditionsEditor name={link.character} editable />
        </div>
      )}
      <TokenInspector item={item} />
    </>
  )
}

/** The GM's side: link the token selected on the map to a character of the vault. */
function SelectedTokenCard() {
  const t = useT()
  const { sceneReady, item } = useSelectedToken()

  return (
    <Card title={t('owlbear.selectedToken')}>
      <p className="mb-3 text-sm text-fg-muted">{t('owlbear.tableIntro')}</p>
      {!sceneReady ? (
        <p className="text-sm text-warning">{t('owlbear.noScene')}</p>
      ) : item ? (
        <TokenLinker key={item.id} item={item} />
      ) : (
        <p className="text-sm text-fg-muted">{t('owlbear.noSelection')}</p>
      )}
    </Card>
  )
}

/**
 * The room's live values for every linked character — what a combat tracker shows, for everyone:
 * pools, armor, mana, passive perception, exhaustion, conditions and initiative, in turn order once
 * initiative is rolled.
 */
function PartyLiveCard({ isGM }: { isGM: boolean }) {
  const t = useT()
  const roster = useOwlbearStore((s) => s.roster)
  const table = useOwlbearStore((s) => s.table)
  const claimed = useOwlbearStore((s) => s.claimed)
  const characters = useVaultStore((s) => s.vault.characters)
  const names = Object.keys(roster).sort(byInitiative(table))
  const anyInitiative = names.some((name) => table[name]?.initiative)

  return (
    <Card
      title={t('owlbear.partyLive')}
      aside={
        isGM && anyInitiative ? (
          <button type="button" className={BUTTON} title={t('owlbear.clearInitiativeHint')} onClick={() => void clearInitiative()}>
            {t('owlbear.clearInitiative')}
          </button>
        ) : undefined
      }
    >
      {names.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('owlbear.partyEmpty')}</p>
      ) : (
        <ul className="divide-y divide-trim/15">
          {names.map((name) => {
            const live = roster[name]
            const initiative = table[name]?.initiative
            const extras = formatExtras(t, live)
            const file = characters.find((c) => c.frontmatter.name === name)
            return (
              <li key={name} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-2.5">
                <div className="min-w-0 flex-1">
                  {file ? (
                    <Link to={characterRoute(name)} className="font-semibold text-fg hover:text-trim hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-fg">{name}</span>
                  )}
                  <p className="text-sm text-fg">
                    {formatPools(t, live)} · {t('owlbear.acShort')} {live.ac}
                  </p>
                  {(extras || initiative) && (
                    <p className="text-xs text-fg-muted">
                      {initiative && <span className="font-semibold text-trim">{formatInitiative(t, initiative)}</span>}
                      {initiative && extras && ' · '}
                      {extras}
                    </p>
                  )}
                  <div className="mt-1">
                    <ConditionsEditor name={name} editable={isGM || claimed.includes(name)} />
                  </div>
                  {live.byName && <p className="text-xs text-fg-muted">{t('owlbear.changedBy', { name: live.byName })}</p>}
                </div>
                {isGM && (
                  <div className="flex gap-2">
                    {file && (
                      <button type="button" className={BUTTON} title={t('owlbear.reloadFromVaultHint')} onClick={() => void pushVitals(name, vitalsOf(file.frontmatter))}>
                        {t('owlbear.reloadFromVault')}
                      </button>
                    )}
                    <button type="button" className={BUTTON} onClick={() => void removeVitals(name)}>
                      {t('owlbear.removeLive')}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/**
 * The GM hands out loot: an item note of the vault goes into the character's inventory as itself,
 * anything else as a temporary item. It waits in the room until the player's companion takes it.
 */
function LootCard() {
  const t = useT()
  const roster = useOwlbearStore((s) => s.roster)
  const loot = useOwlbearStore((s) => s.loot)
  const vault = useVaultStore((s) => s.vault)
  const [character, setCharacter] = useState('')
  const [name, setName] = useState('')
  const [plaetze, setPlaetze] = useState(1)
  const [busy, setBusy] = useState(false)

  const recipients = [...new Set([...Object.keys(roster), ...vault.characters.map((c) => c.frontmatter.name)])].sort((a, b) => a.localeCompare(b))
  const itemNames = [...new Set([...vault.endeavourItems, ...vault.items].map((item) => item.frontmatter.name))].sort((a, b) => a.localeCompare(b))
  const trimmed = name.trim()
  const isNote = itemNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())

  const send = () => {
    setBusy(true)
    void sendLoot({ character, name: trimmed, ...(isNote ? {} : { plaetze }) })
      .then(() => setName(''))
      .finally(() => setBusy(false))
  }

  return (
    <Card title={t('owlbear.loot')}>
      <p className="mb-3 text-sm text-fg-muted">{t('owlbear.lootIntro')}</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-fg-muted">
          {t('owlbear.chooseCharacter')}
          <select value={character} onChange={(e) => setCharacter(e.target.value)} className="rounded-md border border-trim/40 bg-surface px-2 py-1.5 text-sm text-fg">
            <option value="" disabled>
              —
            </option>
            {recipients.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-fg-muted">
          {t('owlbear.lootItem')}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            list="owlbear-loot-items"
            className="rounded-md border border-trim/40 bg-surface px-2 py-1.5 text-sm text-fg"
          />
          <datalist id="owlbear-loot-items">
            {itemNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
        {trimmed && !isNote && (
          <label className="flex w-20 flex-col gap-1 text-xs text-fg-muted">
            {t('owlbear.lootSlots')}
            <input
              type="number"
              min={1}
              max={7}
              value={plaetze}
              onChange={(e) => setPlaetze(Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
              className="rounded-md border border-trim/40 bg-surface px-2 py-1.5 text-sm text-fg"
            />
          </label>
        )}
        <button type="button" className={BUTTON} disabled={busy || !character || !trimmed} onClick={send}>
          {t('owlbear.lootSend')}
        </button>
      </div>
      {trimmed && <p className="mt-2 text-xs text-fg-muted">{t(isNote ? 'owlbear.lootAsNote' : 'owlbear.lootAsTemporary')}</p>}
      {loot.length > 0 && (
        <ul className="mt-3 divide-y divide-trim/15 text-sm">
          {loot.map((drop) => (
            <li key={drop.id} className="flex items-center gap-3 py-1.5">
              <span className="min-w-0 flex-1 text-fg">
                {drop.name} → <span className="font-semibold">{drop.character}</span>
                <span className="text-xs text-fg-muted"> · {t('owlbear.lootPending')}</span>
              </span>
              <button type="button" className={BUTTON} onClick={() => void cancelLoot(drop.id)}>
                {t('owlbear.lootCancel')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** Only inside Owlbear Rodeo: the session around the sheets — linked tokens, live values and loot. */
export function TablePage() {
  const isGM = useOwlbearStore((s) => s.role === 'GM')
  return (
    <div className="space-y-5">
      {isGM && <SelectedTokenCard />}
      <PartyLiveCard isGM={isGM} />
      {isGM && <LootCard />}
    </div>
  )
}
