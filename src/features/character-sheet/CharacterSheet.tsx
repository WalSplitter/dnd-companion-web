import { Fragment, useState, type ReactNode } from 'react'
import { useT } from '../../i18n/useI18n'
import { useShellWidth, WIDE_QUERY } from '../../layout/shell'
import { useMediaQuery } from '../../utils/viewport'
import { VaultIndexProvider } from '../../components/obsidian/VaultIndexContext'
import type { CharacterFrontmatter } from '../../vault/types'
import type { VaultIndex } from '../../vault/wikilinks'
import { InventoryPanel } from '../inventory/InventoryPanel'
import { JournalPanel } from '../journal/JournalPanel'
import { SkillTreePanel } from '../skill-tree/SkillTreePanel'
import { SpellsPanel } from '../spells/SpellsPanel'
import { AbilityScores } from './components/AbilityScores'
import { BiographyPanel } from './components/BiographyPanel'
import { Attacks } from './components/Attacks'
import { AttacksSpellcasting } from './components/AttacksSpellcasting'
import { ArmorClass, CombatStats, Evasion } from './components/CombatStats'
import { Conditions } from './components/Conditions'
import { FallenOverlay } from './components/FallenOverlay'
import { FeaturesTraits } from './components/FeaturesTraits'
import { Header } from './components/Header'
import { HitPoints } from './components/HitPoints'
import { SensesLanguages } from './components/SensesLanguages'
import { Skills } from './components/Skills'
import { characterFate } from '../../rules/vitals'
import { D20PenaltyContext } from '../../dice/d20Penalty'
import { RollLog } from '../../dice/RollLog'
import { RollerContext } from '../../dice/rollLogStore'
import { hasBiography } from '../../vault/adapters/biography'
import { exhaustionD20Penalty } from '../../rules/deriveStats'
import { evasionValue } from '../../rules/endeavour'
import { Rune } from '../../onboarding/Rune'

type Tab = 'sheet' | 'inventory' | 'spells' | 'skills' | 'journal' | 'biography'

type SheetCard = 'attributes' | 'spellcasting' | 'senses' | 'skills' | 'attacks' | 'conditions' | 'features'

interface SheetColumn {
  cards: SheetCard[]
  className?: string
}

/**
 * The sheet tab's columns, top to bottom. Left: who the character is; middle: skills; right: what
 * they do in play. Saves live on the attribute medallions, so the three columns come out about
 * equally long; the backstory has its own Biography tab. Spellcasting sits under the attributes it is
 * derived from: in the right column, under attacks and above the features, it made a caster's right
 * column far longer than the other two.
 */
const SHEET_COLUMNS: SheetColumn[] = [{ cards: ['attributes', 'spellcasting', 'senses'] }, { cards: ['skills'] }, { cards: ['attacks', 'conditions', 'features'] }]

/**
 * Very wide screens: the cards side by side instead of stacked, so the tab fits the screen's height.
 * The features get a column of their own (two on an ultra-wide, where their groups and lines spread
 * out — the column is their `@container`), spellcasting moves under the attacks.
 */
const WIDE_SHEET_COLUMNS: SheetColumn[] = [
  { cards: ['attributes', 'senses'] },
  { cards: ['skills'] },
  { cards: ['attacks', 'spellcasting', 'conditions'] },
  { cards: ['features'], className: '@container ultra:col-span-2' },
]

/** The sheet tab. Columns and cards are keyed, so crossing the wide breakpoint only rebuilds the cards that change columns. */
function SheetTab({ character, characterPath, wide }: { character: CharacterFrontmatter; characterPath: string; wide: boolean }) {
  const cards: Record<SheetCard, ReactNode> = {
    attributes: (
      <div data-tour="sheet.attributes">
        <AbilityScores character={character} characterPath={characterPath} />
      </div>
    ),
    spellcasting: character.spellcasting && <AttacksSpellcasting character={character} characterPath={characterPath} />,
    senses: <SensesLanguages character={character} />,
    skills: (
      <div data-tour="sheet.skills">
        <Skills character={character} />
      </div>
    ),
    attacks: <Attacks character={character} />,
    conditions: <Conditions character={character} characterPath={characterPath} />,
    features: <FeaturesTraits character={character} characterPath={characterPath} />,
  }
  return (
    <div className={`grid items-start gap-4 ${wide ? 'grid-cols-4 ultra:grid-cols-5' : 'grid-cols-1 lg:grid-cols-3'}`}>
      {(wide ? WIDE_SHEET_COLUMNS : SHEET_COLUMNS).map((column) => (
        <div key={column.cards[0]} className={column.className ?? 'space-y-4'}>
          {column.cards.map((card) => (
            <Fragment key={card}>{cards[card]}</Fragment>
          ))}
        </div>
      ))}
    </div>
  )
}

export function CharacterSheet({
  character,
  characterPath,
  index,
  body,
}: {
  character: CharacterFrontmatter
  characterPath: string
  index: VaultIndex
  body?: string
}) {
  const t = useT()
  const [tab, setTab] = useState<Tab>('sheet')
  const hasSpells = Boolean(character.spellcasting)
  const evasion = evasionValue(character)

  const tabs: { key: Tab; label: string; shortLabel?: string }[] = [
    { key: 'sheet', label: t('tabs.sheet'), shortLabel: t('tabs.sheetShort') },
    { key: 'inventory', label: t('tabs.inventory') },
    ...(hasSpells ? ([{ key: 'spells', label: t('tabs.spells') }] as const) : []),
    { key: 'journal', label: t('tabs.journal') },
    ...(character.class.length > 0 ? ([{ key: 'skills', label: t('tabs.skills') }] as const) : []),
    ...(hasBiography(character, body) ? ([{ key: 'biography', label: t('tabs.biography') }] as const) : []),
  ]
  // Switching characters keeps the open tab — unless the next one doesn't have it (no spells, say).
  const shownTab: Tab = tabs.some((entry) => entry.key === tab) ? tab : 'sheet'
  // Very wide screens: the page grows, and each tab lays its cards out across the room
  const wide = useMediaQuery(WIDE_QUERY)
  useShellWidth('sheet')

  return (
    <VaultIndexProvider index={index}>
      {/* Exhaustion lowers every d20 roll on the sheet — see `D20PenaltyContext`. */}
      <D20PenaltyContext value={exhaustionD20Penalty(character)}>
        <RollerContext value={character.name}>
          <div className="space-y-5">
            <FallenOverlay fate={characterFate(character)} characterPath={characterPath} />
            <Header character={character} characterPath={characterPath} />

            {/* Vitals stay visible on every tab, like a game HUD. */}
            <section data-tour="sheet.vitals" className="rpg-panel flex flex-wrap items-center gap-x-6 gap-y-4 px-4 py-3">
              <div data-tour="sheet.defense" className="flex shrink-0 items-end gap-2">
                <ArmorClass character={character} />
                {evasion !== undefined && <Evasion value={evasion} character={character} />}
              </div>
              <HitPoints character={character} characterPath={characterPath} stats={<CombatStats character={character} />} />
            </section>

            {/* Phones get the short labels so all tabs fit one row; should they still not fit
                (very narrow screens), the row wraps rather than pushing a tab off-screen. The roll log
                sits at the row's end: there on every tab, yet in the flow, so it covers nothing. */}
            <div className="flex items-end gap-2 border-b border-trim/25">
              <div role="tablist" className="flex flex-1 flex-wrap gap-0.5 whitespace-nowrap sm:gap-1">
                {tabs.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    role="tab"
                    data-tour={`sheet.tab.${entry.key}`}
                    aria-selected={shownTab === entry.key}
                    aria-label={entry.shortLabel ? entry.label : undefined}
                    onClick={() => setTab(entry.key)}
                    className="rpg-tab cursor-pointer"
                  >
                    {entry.shortLabel ? (
                      <>
                        <span className="sm:hidden">{entry.shortLabel}</span>
                        <span className="hidden sm:inline">{entry.label}</span>
                      </>
                    ) : (
                      entry.label
                    )}
                  </button>
                ))}
              </div>
              <span className="mb-2 shrink-0">
                <Rune term="advantage" character={character} />
              </span>
              <RollLog />
            </div>

            {/* One anchor for whichever tab is open, for the tour's steps about it. */}
            <div data-tour="sheet.panel">
              {shownTab === 'sheet' && <SheetTab character={character} characterPath={characterPath} wide={wide} />}

              {/* Keyed by character: a draft, search or selection belongs to the character it was made on. */}
              {shownTab === 'inventory' && <InventoryPanel key={characterPath} character={character} characterPath={characterPath} index={index} />}
              {shownTab === 'spells' && <SpellsPanel key={characterPath} character={character} characterPath={characterPath} index={index} />}
              {shownTab === 'skills' && <SkillTreePanel key={characterPath} character={character} />}
              {shownTab === 'journal' && <JournalPanel key={characterPath} character={character} characterPath={characterPath} />}
              {shownTab === 'biography' && <BiographyPanel key={characterPath} character={character} story={body} />}
            </div>
          </div>
        </RollerContext>
      </D20PenaltyContext>
    </VaultIndexProvider>
  )
}
