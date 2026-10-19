import type { RawFile } from '../rawFile'
import type { CampaignJournal, JournalEntry } from '../types'
import { parseJournal } from './journal'

/**
 * The DM's campaign journal: quests, people, places and loot the whole party should know about, kept
 * on the campaign level rather than with any one character —
 *
 *     ---
 *     type: campaign-journal
 *     title: Die Schatten über Dornfurt
 *     dm:
 *       - LorenJaffrey
 *     journal:
 *       - session: 7
 *         kind: quest
 *         title: Zum Steinkreis
 *         for: ["[[Aldric von Hohenwacht]]"]
 *         text: |-
 *           …
 *     ---
 *
 * Entries use a character journal's schema (see `adapters/journal.ts`) — with `for:`, the characters an
 * entry is meant for (absent: the whole party). `dm:` names the GitHub accounts that may write it; the
 * app shows it read-only to everyone else, in its own tab and inside every character's journal.
 *
 * Found by `type: campaign-journal`, else by its name `Kampagnenbuch.md`. Without one, it's created on
 * the first entry one folder above the party's: next to `Kampagne/Gruppe/`, the folder holding the
 * character folders.
 */

export const CAMPAIGN_JOURNAL_TYPE = 'campaign-journal'
export const CAMPAIGN_JOURNAL_NAME = 'Kampagnenbuch'

function stringList(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
  return list.flatMap((v) => (typeof v === 'string' && v.trim() ? [v.trim()] : []))
}

/** The `dm:` logins — a leading `@` is allowed and dropped. */
export function parseDms(value: unknown): string[] {
  return stringList(value).map((login) => login.replace(/^@/, ''))
}

/** Text of a new campaign journal note, with `dms` (may be empty) as its DMs. */
export function campaignJournalContent(dms: string[] = []): string {
  const dm = dms.length > 0 ? `dm:\n${dms.map((d) => `  - ${d}`).join('\n')}\n` : ''
  return (
    `---\ntype: ${CAMPAIGN_JOURNAL_TYPE}\n${dm}---\n\n` +
    `Kampagnenbuch der Gruppe — gepflegt vom Spielleiter in der Companion-App. Die Einträge stehen im Frontmatter (\`journal:\`).\n`
  )
}

const segments = (path: string) => path.split('/').slice(0, -1)

/**
 * Where a new campaign journal goes: one folder above the party folder — the deepest folder that holds
 * every character's own folder (`Kampagne/Gruppe/<Name>/<Name>.md` → `Kampagne/`). The vault's root
 * when the characters aren't nested that deep.
 */
export function campaignFolder(characterPaths: string[]): string {
  if (characterPaths.length === 0) return ''
  // Each character's folder's parent: the party folder, as far as this character can tell.
  const parties = characterPaths.map((p) => segments(p).slice(0, -1))
  const common: string[] = []
  for (let i = 0; parties.every((p) => i < p.length && p[i] === parties[0][i]); i++) common.push(parties[0][i])
  const campaign = common.slice(0, -1)
  return campaign.length > 0 ? `${campaign.join('/')}/` : ''
}

/** The vault's campaign journal, or where to create it. */
export function resolveCampaignJournal(files: RawFile[], characterPaths: string[]): CampaignJournal {
  const source =
    files.find((f) => f.data.type === CAMPAIGN_JOURNAL_TYPE) ?? files.find((f) => f.name.trim().toLowerCase() === CAMPAIGN_JOURNAL_NAME.toLowerCase())
  if (!source) return { path: `${campaignFolder(characterPaths)}${CAMPAIGN_JOURNAL_NAME}.md`, create: campaignJournalContent(), dms: [], entries: [] }
  return campaignFromFile(source)
}

/** The campaign journal a (re-read) note holds. */
export function campaignFromFile(file: RawFile): CampaignJournal {
  const title = typeof file.data.title === 'string' && file.data.title.trim() ? file.data.title.trim() : undefined
  return { path: file.path, ...(title && { title }), dms: parseDms(file.data.dm), entries: parseJournal(file.data.journal) }
}

/** Whether `entry` is meant for the character `name` (no audience: everyone). */
export function isFor(entry: JournalEntry, name: string): boolean {
  const target = name.trim().toLowerCase()
  return !entry.audience?.length || entry.audience.some((a) => a.trim().toLowerCase() === target)
}

/** Whether the GitHub account `login` is one of the campaign's DMs. */
export function isDm(campaign: Pick<CampaignJournal, 'dms'>, login: string | null | undefined): boolean {
  if (!login) return false
  const me = login.toLowerCase()
  return campaign.dms.some((dm) => dm.toLowerCase() === me)
}
