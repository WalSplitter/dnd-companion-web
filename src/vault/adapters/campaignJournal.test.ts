import { describe, expect, it } from 'vitest'
import { buildVault } from '../parseFrontmatter'
import { parseRawFile } from '../rawFile'
import { applyPatch, campaignDmPatch, journalPatch } from '../writeback/persist'
import { campaignFolder, campaignJournalContent, isDm, isFor, resolveCampaignJournal } from './campaignJournal'
import { parseJournal } from './journal'

const raw = (path: string, content: string) => parseRawFile({ path, content })
const strip = <T extends { id: string }>(list: T[]) => list.map(({ id: _id, ...rest }) => rest)

describe('campaignFolder', () => {
  it('is one folder above the folder holding the character folders', () => {
    expect(campaignFolder(['Kampagne/Gruppe/Aldric/Aldric.md', 'Kampagne/Gruppe/Borin/Borin.md'])).toBe('Kampagne/')
    expect(campaignFolder(['01 - Spielerbereich/Kampagne/Gruppe/Dummy/Dummy.md'])).toBe('01 - Spielerbereich/Kampagne/')
  })

  it('falls back to the vault root when characters are not nested that deep', () => {
    expect(campaignFolder(['Gruppe/Aldric.md', 'Gruppe/Borin.md'])).toBe('')
    expect(campaignFolder(['Aldric.md'])).toBe('')
    expect(campaignFolder([])).toBe('')
  })

  it('takes the deepest folder all characters share', () => {
    expect(campaignFolder(['A/Gruppe/X/X.md', 'A/Andere/Y/Y.md'])).toBe('')
    expect(campaignFolder(['K/A/Gruppe/X/X.md', 'K/A/Gruppe/Y/Y.md', 'K/A/Gruppe/Z/Z.md'])).toBe('K/A/')
  })
})

describe('resolveCampaignJournal', () => {
  const characters = ['Kampagne/Gruppe/Aldric/Aldric.md']

  it('reads the note marked as the campaign journal, wherever it lives', () => {
    const file = raw(
      'Notizen/Unsere Kampagne.md',
      `---\ntype: campaign-journal\ntitle: Schatten\ndm:\n  - "@LorenJaffrey"\njournal:\n  - session: 2\n    kind: npc\n    title: Hadwig\n    for: ["[[Aldric]]", "[[Borin Eisenfaust|Borin]]"]\n    text: Schulzin.\n  - kind: quest\n    for: [[Ilsa]]\n    text: Unquoted link.\n---\n`,
    )
    const campaign = resolveCampaignJournal([file], characters)
    expect(campaign.path).toBe('Notizen/Unsere Kampagne.md')
    expect(campaign.create).toBeUndefined()
    expect(campaign.title).toBe('Schatten')
    expect(campaign.dms).toEqual(['LorenJaffrey'])
    expect(strip(campaign.entries)).toEqual([
      { session: 2, kind: 'npc', title: 'Hadwig', audience: ['Aldric', 'Borin Eisenfaust'], text: 'Schulzin.' },
      { kind: 'quest', audience: ['Ilsa'], text: 'Unquoted link.' },
    ])
  })

  it('finds a note named Kampagnenbuch without the marker', () => {
    const campaign = resolveCampaignJournal([raw('X/Kampagnenbuch.md', '---\njournal:\n  - Hallo\n---\n')], characters)
    expect(campaign.path).toBe('X/Kampagnenbuch.md')
    expect(campaign.entries).toHaveLength(1)
  })

  it('without one, plans a Kampagnenbuch.md on the campaign level', () => {
    const campaign = resolveCampaignJournal([], characters)
    expect(campaign).toEqual({ path: 'Kampagne/Kampagnenbuch.md', create: campaignJournalContent(), dms: [], entries: [] })
  })

  it('is part of every built vault', () => {
    const vault = buildVault([{ path: 'Kampagne/Gruppe/A/A.md', content: '---\ntype: character\nname: A\n---\n' }])
    expect(vault.campaign?.path).toBe('Kampagne/Kampagnenbuch.md')
  })
})

describe('campaign journal write-back', () => {
  it('creates the note, enters the DM and writes entries with their audience', () => {
    const entries = parseJournal([{ session: 1, kind: 'quest', title: 'Wölfe', for: ['[[Aldric]]'], text: 'Hadwig bittet um Hilfe.' }])
    let content = applyPatch('', { kind: 'create', keyPath: [], value: campaignJournalContent() })
    content = applyPatch(content, campaignDmPatch(['LorenJaffrey']))
    content = applyPatch(content, journalPatch(entries))

    const campaign = resolveCampaignJournal([raw('Kampagne/Kampagnenbuch.md', content)], [])
    expect(campaign.dms).toEqual(['LorenJaffrey'])
    expect(strip(campaign.entries)).toEqual(strip(entries))
    expect(content).toContain("for:\n      - '[[Aldric]]'")
  })
})

describe('isFor / isDm', () => {
  const [forAll, forAldric] = parseJournal([
    { kind: 'note', text: 'alle' },
    { kind: 'note', text: 'nur Aldric', for: '[[Aldric von Hohenwacht]]' },
  ])

  it('shows an entry without audience to everyone, else only to those named', () => {
    expect(isFor(forAll, 'Borin')).toBe(true)
    expect(isFor(forAldric, 'aldric von hohenwacht')).toBe(true)
    expect(isFor(forAldric, 'Borin')).toBe(false)
  })

  it('matches GitHub logins regardless of case', () => {
    expect(isDm({ dms: ['LorenJaffrey'] }, 'lorenjaffrey')).toBe(true)
    expect(isDm({ dms: ['LorenJaffrey'] }, 'someone')).toBe(false)
    expect(isDm({ dms: [] }, null)).toBe(false)
  })
})
