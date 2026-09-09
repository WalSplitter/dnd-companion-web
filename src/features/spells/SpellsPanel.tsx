import { Card } from '../../components/Card'
import { formatModifier, spellAttackBonus, spellSaveDC } from '../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../vault/types'
import type { VaultIndex } from '../../vault/wikilinks'
import { SpellList } from './components/SpellList'
import { SpellSlotTracker } from './components/SpellSlotTracker'

export function SpellsPanel({ character, index }: { character: CharacterFrontmatter; index: VaultIndex }) {
  if (!character.spellcasting) {
    return <p className="text-sm text-fg-muted">This character has no spellcasting.</p>
  }

  const dc = spellSaveDC(character)
  const attack = spellAttackBonus(character)

  return (
    <div className="space-y-4">
      <Card title="Spellcasting">
        <div className="mb-4 grid grid-cols-3 gap-2 text-center sm:max-w-sm">
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <div className="text-xs uppercase text-fg-muted">Ability</div>
            <div className="font-semibold uppercase text-fg">{character.spellcasting.ability}</div>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <div className="text-xs uppercase text-fg-muted">Save DC</div>
            <div className="font-semibold text-fg">{dc}</div>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <div className="text-xs uppercase text-fg-muted">Attack</div>
            <div className="font-semibold text-fg">{attack !== undefined ? formatModifier(attack) : '—'}</div>
          </div>
        </div>
        <SpellSlotTracker spellcasting={character.spellcasting} />
      </Card>
      <Card title="Spells Known">
        <SpellList links={character.spells_known ?? []} index={index} />
      </Card>
    </div>
  )
}
