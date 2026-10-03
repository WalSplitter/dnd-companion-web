import type { ReactNode } from 'react'
import { Card } from '../../components/Card'
import { ResourcePoolBar } from '../../components/ResourcePoolBar'
import { D20RollButton } from '../../dice/RollButton'
import { useT } from '../../i18n/useI18n'
import { D20Modifier, SpellSaveDCValue } from '../../components/ExhaustedValue'
import { spellAttackBonus } from '../../vault/deriveStats'
import { ABILITY_TO_NIMBLE_ATTRIBUTE, type CharacterFrontmatter } from '../../vault/types'
import type { VaultIndex } from '../../vault/wikilinks'
import { SpellList } from './components/SpellList'
import { SpellSlotTracker } from './components/SpellSlotTracker'

/** One casting value as a small engraved chip: the value, then its caption. */
function CastingStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="rpg-plate flex items-baseline gap-1.5 px-2.5 py-1">
      <span className="font-num text-base leading-none text-fg">{children}</span>
      <span className="text-[0.62rem] font-medium uppercase tracking-wider text-fg-muted">{label}</span>
    </span>
  )
}

/**
 * The spells tab: the known spells, with the casting values (ability, save DC, attack) at the end of
 * the heading. The mana pool lives in the vitals HUD above every tab, so it isn't repeated here;
 * spell slots and other resource pools, which the HUD doesn't show, get their own card.
 */
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

  const attack = spellAttackBonus(character)
  const ability = character.nimble_attributes ? ABILITY_TO_NIMBLE_ATTRIBUTE[character.spellcasting.ability] : character.spellcasting.ability
  const pools = character.resource_pools ?? []

  const castingStats = (
    <div className="flex flex-wrap items-center gap-1.5">
      <CastingStat label={t('stats.ability')}>{ability.toUpperCase()}</CastingStat>
      <CastingStat label={t('stats.saveDC')}>
        <SpellSaveDCValue character={character} />
      </CastingStat>
      <CastingStat label={t('stats.attack')}>
        {attack !== undefined ? (
          <D20RollButton label={t('roll.spellAttack')} modifier={attack} className="cursor-pointer transition hover:text-trim">
            <D20Modifier value={attack} hint={false} />
          </D20RollButton>
        ) : (
          '—'
        )}
      </CastingStat>
    </div>
  )

  return (
    <div className="space-y-4">
      {(character.spellcasting.slots || pools.length > 0) && (
        <Card title={t('cards.spellcasting')}>
          {character.spellcasting.slots && (
            <SpellSlotTracker spellcasting={character.spellcasting} characterPath={characterPath} writeTargets={character._write?.spell_slots} />
          )}
          {pools.length > 0 && (
            <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${character.spellcasting.slots ? 'mt-3' : ''}`}>
              {pools.map((pool) => (
                <ResourcePoolBar key={pool.name} pool={pool} />
              ))}
            </div>
          )}
        </Card>
      )}
      <Card title={t('cards.spellsKnown')} aside={castingStats}>
        <SpellList links={character.spells_known ?? []} index={index} character={character} characterPath={characterPath} />
      </Card>
    </div>
  )
}
