import { useState } from 'react'
import { useT } from '../../i18n/I18nContext'
import { VaultIndexProvider } from '../../vault/VaultIndexContext'
import type { CharacterFrontmatter } from '../../vault/types'
import type { VaultIndex } from '../../vault/wikilinks'
import { InventoryPanel } from '../inventory/InventoryPanel'
import { SpellsPanel } from '../spells/SpellsPanel'
import { AbilityScores } from './components/AbilityScores'
import { About } from './components/About'
import { Attacks } from './components/Attacks'
import { AttacksSpellcasting } from './components/AttacksSpellcasting'
import { ArmorClass, CombatStats } from './components/CombatStats'
import { Conditions } from './components/Conditions'
import { DeathSaves } from './components/DeathSaves'
import { FeaturesTraits } from './components/FeaturesTraits'
import { Header } from './components/Header'
import { HitPoints } from './components/HitPoints'
import { SavingThrows } from './components/SavingThrows'
import { SensesLanguages } from './components/SensesLanguages'
import { Skills } from './components/Skills'

type Tab = 'sheet' | 'inventory' | 'spells'

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sheet', label: t('tabs.sheet') },
    { key: 'inventory', label: t('tabs.inventory') },
    ...(hasSpells ? ([{ key: 'spells', label: t('tabs.spells') }] as const) : []),
  ]

  return (
    <VaultIndexProvider index={index}>
      <div className="space-y-5">
        <Header character={character} />

        {/* Vitals stay visible on every tab, like a game HUD. */}
        <section className="rpg-panel flex flex-wrap items-center gap-x-6 gap-y-4 p-4">
          <ArmorClass character={character} />
          <HitPoints character={character} characterPath={characterPath} />
          <CombatStats character={character} />
        </section>
        <DeathSaves character={character} />

        <div role="tablist" className="flex gap-1 border-b border-trim/25">
          {tabs.map((entry) => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={tab === entry.key}
              onClick={() => setTab(entry.key)}
              className="rpg-tab cursor-pointer"
            >
              {entry.label}
            </button>
          ))}
        </div>

        {tab === 'sheet' && (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
            <div className="space-y-4">
              <AbilityScores character={character} characterPath={characterPath} />
              <SavingThrows character={character} characterPath={characterPath} />
              <SensesLanguages character={character} />
            </div>
            <Skills character={character} characterPath={characterPath} />
            <div className="space-y-4">
              <Attacks character={character} />
              {hasSpells && <AttacksSpellcasting character={character} characterPath={characterPath} index={index} />}
              <Conditions character={character} characterPath={characterPath} />
              <FeaturesTraits character={character} />
              <About body={body} />
            </div>
          </div>
        )}

        {tab === 'inventory' && <InventoryPanel character={character} characterPath={characterPath} index={index} />}
        {tab === 'spells' && hasSpells && <SpellsPanel character={character} characterPath={characterPath} index={index} />}
      </div>
    </VaultIndexProvider>
  )
}
