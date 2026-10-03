import { useState } from 'react'
import { useT } from '../../i18n/useI18n'
import { VaultIndexProvider } from '../../vault/VaultIndexContext'
import type { CharacterFrontmatter } from '../../vault/types'
import type { VaultIndex } from '../../vault/wikilinks'
import { InventoryPanel } from '../inventory/InventoryPanel'
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
import { characterFate } from './vitals'
import { D20PenaltyContext } from '../../dice/d20Penalty'
import { hasBiography } from '../../vault/adapters/biography'
import { evasionValue, exhaustionD20Penalty } from '../../vault/deriveStats'

type Tab = 'sheet' | 'inventory' | 'spells' | 'biography'

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
    ...(hasBiography(character, body) ? ([{ key: 'biography', label: t('tabs.biography') }] as const) : []),
  ]

  return (
    <VaultIndexProvider index={index}>
      {/* Exhaustion lowers every d20 roll on the sheet — see `D20PenaltyContext`. */}
      <D20PenaltyContext value={exhaustionD20Penalty(character)}>
        <div className="space-y-5">
          <FallenOverlay fate={characterFate(character)} characterPath={characterPath} />
          <Header character={character} />

          {/* Vitals stay visible on every tab, like a game HUD. */}
          <section className="rpg-panel flex flex-wrap items-center gap-x-6 gap-y-4 px-4 py-3">
            <div className="flex shrink-0 items-end gap-2">
              <ArmorClass character={character} />
              {evasion !== undefined && <Evasion value={evasion} character={character} />}
            </div>
            <HitPoints character={character} characterPath={characterPath} stats={<CombatStats character={character} />} />
          </section>

          {/* Phones get the short labels so all four tabs fit one row; should they still not fit
              (very narrow screens), the row wraps rather than pushing a tab off-screen. */}
          <div role="tablist" className="flex flex-wrap gap-0.5 whitespace-nowrap border-b border-trim/25 sm:gap-1">
            {tabs.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={tab === entry.key}
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

          {tab === 'sheet' && (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
              {/* Left: who the character is; middle: skills; right: what they do in play. Saves live on
                  the attribute medallions, so the three columns come out about equally long; the
                  backstory has its own Biography tab. Spellcasting sits under the attributes it is
                  derived from: in the right column, under attacks and above the features, it made
                  a caster's right column far longer than the other two. */}
              <div className="space-y-4">
                <AbilityScores character={character} characterPath={characterPath} />
                {hasSpells && <AttacksSpellcasting character={character} characterPath={characterPath} />}
                <SensesLanguages character={character} />
              </div>
              <Skills character={character} />
              <div className="space-y-4">
                <Attacks character={character} />
                <Conditions character={character} characterPath={characterPath} />
                <FeaturesTraits character={character} />
              </div>
            </div>
          )}

          {tab === 'inventory' && <InventoryPanel character={character} characterPath={characterPath} index={index} />}
          {tab === 'spells' && hasSpells && <SpellsPanel character={character} characterPath={characterPath} index={index} />}
          {tab === 'biography' && <BiographyPanel character={character} story={body} />}
        </div>
      </D20PenaltyContext>
    </VaultIndexProvider>
  )
}
