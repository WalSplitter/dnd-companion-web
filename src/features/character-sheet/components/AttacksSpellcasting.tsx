import { Card } from '../../../components/Card'
import { D20Modifier, SpellSaveDCValue } from '../../../components/ExhaustedValue'
import { StatPlate } from '../../../components/StatPlate'
import { ResourcePoolBar } from '../../../components/ResourcePoolBar'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'
import { spellAttackBonus } from '../../../vault/deriveStats'
import { ABILITY_TO_NIMBLE_ATTRIBUTE, type CharacterFrontmatter } from '../../../vault/types'
import { ManaVessel } from '../../spells/components/ManaVessel'
import { SpellSlotTracker } from '../../spells/components/SpellSlotTracker'

/** Spellcasting at a glance: ability, save DC, attack and the casting resources. The spells
 * themselves (cantrips included) live on the spells tab. */
export function AttacksSpellcasting({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  if (!character.spellcasting) return null

  const attack = spellAttackBonus(character)

  // On a Nimble-flavored sheet, `spellcasting.ability` is still the untouched D&D bridge ability
  // (see `CharacterFrontmatter.nimble_attributes`'s doc comment) — shown as its Nimble equivalent
  // here so this plate doesn't show a stray D&D letter amid an otherwise all-Nimble sheet.
  const abilityAbbr = character.nimble_attributes
    ? ABILITY_TO_NIMBLE_ATTRIBUTE[character.spellcasting.ability].toUpperCase()
    : character.spellcasting.ability.toUpperCase()

  return (
    <Card title={t('cards.spellcasting')}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatPlate label={t('stats.ability')} value={abilityAbbr} />
          <StatPlate label={t('stats.saveDC')}>
            <SpellSaveDCValue character={character} />
          </StatPlate>
          <StatPlate label={t('stats.attack')}>
            {attack !== undefined ? (
              <D20RollButton label={t('roll.spellAttack')} modifier={attack} className="cursor-pointer transition hover:text-trim">
                <D20Modifier value={attack} hint={false} />
              </D20RollButton>
            ) : (
              '—'
            )}
          </StatPlate>
        </div>

        {character.spellcasting.mana && (
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-fg-muted">{t('stats.mana')}</div>
            <ManaVessel mana={character.spellcasting.mana} characterPath={characterPath} writeTarget={character._write?.mana_current} />
          </div>
        )}

        {character.spellcasting.slots && (
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-fg-muted">{t('stats.spellSlots')}</div>
            <SpellSlotTracker spellcasting={character.spellcasting} characterPath={characterPath} writeTargets={character._write?.spell_slots} />
          </div>
        )}

        {character.resource_pools && character.resource_pools.length > 0 && (
          <div className="space-y-2">
            {character.resource_pools.map((pool) => (
              <ResourcePoolBar key={pool.name} pool={pool} />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
