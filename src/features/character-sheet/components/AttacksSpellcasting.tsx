import { Card } from '../../../components/Card'
import { D20Modifier, SpellSaveDCValue } from '../../../components/ExhaustedValue'
import { StatPlate } from '../../../components/StatPlate'
import { ResourcePoolBar } from '../../../components/ResourcePoolBar'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'
import { abilityAbbreviation, spellAttackBonus } from '../../../rules/deriveStats'
import { spellAttackDerivation } from '../../../rules/derivation'
import type { CharacterFrontmatter } from '../../../vault/types'
import { SpellSlotTracker } from '../../spells/components/SpellSlotTracker'
import { lexiconRuleset } from '../../../onboarding/lexicon'
import { Rune } from '../../../onboarding/Rune'

/** Spellcasting at a glance: ability, save DC, attack and the casting resources. The spells
 * themselves (cantrips included) live on the spells tab; the mana pool sits in the vitals HUD. */
export function AttacksSpellcasting({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  if (!character.spellcasting) return null

  const attack = spellAttackBonus(character)

  const abilityAbbr = abilityAbbreviation(character, character.spellcasting.ability)

  return (
    <Card
      title={t('cards.spellcasting')}
      titleExtra={
        <>
          <Rune term="mana" ruleset={lexiconRuleset(character)} />
          <Rune term="spellSlots" ruleset={lexiconRuleset(character)} />
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatPlate label={t('stats.ability')} value={abilityAbbr} />
          <StatPlate label={t('stats.saveDC')}>
            <SpellSaveDCValue character={character} />
          </StatPlate>
          <StatPlate label={t('stats.attack')}>
            {attack !== undefined ? (
              <D20RollButton attack label={t('roll.spellAttack')} modifier={attack} derivation={spellAttackDerivation(character)} className="cursor-pointer transition hover:text-trim">
                <D20Modifier value={attack} hint={false} />
              </D20RollButton>
            ) : (
              '—'
            )}
          </StatPlate>
        </div>

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
