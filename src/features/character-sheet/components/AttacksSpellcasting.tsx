import { Card } from '../../../components/Card'
import { D20RollButton } from '../../../dice/RollButton'
import { formatModifier, spellAttackBonus, spellSaveDC } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'
import type { VaultIndex } from '../../../vault/wikilinks'
import { resolveSpellLink } from '../../../vault/wikilinks'
import { SpellSlotTracker } from '../../spells/components/SpellSlotTracker'

export function AttacksSpellcasting({
  character,
  characterPath,
  index,
}: {
  character: CharacterFrontmatter
  characterPath: string
  index: VaultIndex
}) {
  if (!character.spellcasting) return null

  const dc = spellSaveDC(character)
  const attack = spellAttackBonus(character)
  const cantrips = (character.spells_known ?? [])
    .map((link) => resolveSpellLink(index, link))
    .filter((s) => s?.frontmatter.level === 0)

  return (
    <Card title="Attacks &amp; Spellcasting">
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
          <div className="text-xs uppercase text-fg-muted">Ability</div>
          <div className="font-semibold uppercase text-fg">{character.spellcasting.ability}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
          <div className="text-xs uppercase text-fg-muted">Save DC</div>
          <div className="font-semibold text-fg">{dc ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
          <div className="text-xs uppercase text-fg-muted">Attack</div>
          {attack !== undefined ? (
            <D20RollButton label="Spell attack" modifier={attack} className="font-semibold text-fg">
              {formatModifier(attack)}
            </D20RollButton>
          ) : (
            <div className="font-semibold text-fg">—</div>
          )}
        </div>
      </div>

      {character.spellcasting.slots && (
        <div className="mb-3">
          <div className="mb-1 text-xs uppercase text-fg-muted">Spell Slots</div>
          <SpellSlotTracker spellcasting={character.spellcasting} characterPath={characterPath} writeTargets={character._write?.spell_slots} />
        </div>
      )}

      {character.resource_pools && character.resource_pools.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {character.resource_pools.map((pool) => (
            <div key={pool.name} className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-center">
              <div className="text-xs uppercase text-fg-muted">{pool.name}</div>
              <div className="font-semibold text-fg">
                {pool.current}/{pool.max}
              </div>
            </div>
          ))}
        </div>
      )}

      {cantrips.length > 0 && (
        <ul className="space-y-1 text-sm text-fg">
          {cantrips.map((c) => (
            <li key={c!.path} className="flex justify-between">
              <span>{c!.frontmatter.name}</span>
              <span className="text-fg-muted">{c!.frontmatter.range}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
