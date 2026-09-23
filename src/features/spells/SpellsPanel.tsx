import { Card } from '../../components/Card'
import { ResourcePoolBar } from '../../components/ResourcePoolBar'
import { D20RollButton } from '../../dice/RollButton'
import { useT } from '../../i18n/useI18n'
import { formatModifier, spellAttackBonus, spellSaveDC } from '../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../vault/types'
import type { VaultIndex } from '../../vault/wikilinks'
import { SpellList } from './components/SpellList'
import { SpellSlotTracker } from './components/SpellSlotTracker'

export function SpellsPanel({
  character,
  characterPath,
  index,
}: {
  character: CharacterFrontmatter
  characterPath: string
  index: VaultIndex
}) {
  const t = useT()
  if (!character.spellcasting) {
    return <p className="text-sm text-fg-muted">{t('spells.noSpellcasting')}</p>
  }

  const dc = spellSaveDC(character)
  const attack = spellAttackBonus(character)

  return (
    <div className="space-y-4">
      <Card title={t('cards.spellcasting')}>
        <div className="mb-4 grid grid-cols-3 gap-2 text-center sm:max-w-sm">
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <div className="text-xs uppercase text-fg-muted">{t('stats.ability')}</div>
            <div className="font-semibold uppercase text-fg">{character.spellcasting.ability}</div>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <div className="text-xs uppercase text-fg-muted">{t('stats.saveDC')}</div>
            <div className="font-semibold text-fg">{dc ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
            <div className="text-xs uppercase text-fg-muted">{t('stats.attack')}</div>
            {attack !== undefined ? (
              <D20RollButton label={t('roll.spellAttack')} modifier={attack} className="font-semibold text-fg">
                {formatModifier(attack)}
              </D20RollButton>
            ) : (
              <div className="font-semibold text-fg">—</div>
            )}
          </div>
        </div>
        {character.spellcasting.slots && (
          <SpellSlotTracker spellcasting={character.spellcasting} characterPath={characterPath} writeTargets={character._write?.spell_slots} />
        )}
        {character.resource_pools && character.resource_pools.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {character.resource_pools.map((pool) => (
              <ResourcePoolBar key={pool.name} pool={pool} />
            ))}
          </div>
        )}
      </Card>
      <Card title={t('cards.spellsKnown')}>
        <SpellList links={character.spells_known ?? []} index={index} character={character} />
      </Card>
    </div>
  )
}
