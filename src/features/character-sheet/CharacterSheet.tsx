import { useState } from 'react'
import { VaultIndexProvider } from '../../vault/VaultIndexContext'
import type { CharacterFrontmatter } from '../../vault/types'
import type { VaultIndex } from '../../vault/wikilinks'
import { InventoryPanel } from '../inventory/InventoryPanel'
import { SpellsPanel } from '../spells/SpellsPanel'
import { AbilityScores } from './components/AbilityScores'
import { About } from './components/About'
import { Attacks } from './components/Attacks'
import { AttacksSpellcasting } from './components/AttacksSpellcasting'
import { CombatStats } from './components/CombatStats'
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
  const [tab, setTab] = useState<Tab>('sheet')
  const hasSpells = Boolean(character.spellcasting)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sheet', label: 'Sheet' },
    { key: 'inventory', label: 'Inventory' },
    ...(hasSpells ? ([{ key: 'spells', label: 'Spells' }] as const) : []),
  ]

  return (
    <VaultIndexProvider index={index}>
      <div className="space-y-4">
        <Header character={character} />

        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === t.key ? 'border-primary text-fg' : 'border-transparent text-fg-muted hover:text-fg'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'sheet' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4">
              <AbilityScores character={character} />
              <SavingThrows character={character} />
              <Skills character={character} />
            </div>
            <div className="space-y-4">
              <CombatStats character={character} />
              <HitPoints character={character} characterPath={characterPath} />
              <DeathSaves character={character} />
              <Conditions character={character} characterPath={characterPath} />
              {hasSpells && <AttacksSpellcasting character={character} characterPath={characterPath} index={index} />}
              <Attacks character={character} />
            </div>
            <div className="space-y-4">
              <About body={body} />
              <SensesLanguages character={character} />
              <FeaturesTraits character={character} />
            </div>
          </div>
        )}

        {tab === 'inventory' && <InventoryPanel character={character} index={index} />}
        {tab === 'spells' && hasSpells && <SpellsPanel character={character} characterPath={characterPath} index={index} />}
      </div>
    </VaultIndexProvider>
  )
}
