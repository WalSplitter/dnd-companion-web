import { Card } from '../../../components/Card'
import { D20Modifier, SpellSaveDCValue } from '../../../components/ExhaustedValue'
import { StatPlate } from '../../../components/StatPlate'
import { ResourcePoolBar } from '../../../components/ResourcePoolBar'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'
import { WikiLink } from '../../../vault/components/WikiLink'
import { spellAttackBonus } from '../../../vault/deriveStats'
import { ABILITY_TO_NIMBLE_ATTRIBUTE, type CharacterFrontmatter } from '../../../vault/types'
import type { VaultIndex } from '../../../vault/wikilinks'
import { resolveSpellLink } from '../../../vault/wikilinks'
import { ManaVessel } from '../../spells/components/ManaVessel'
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
  const t = useT()
  if (!character.spellcasting) return null

  const attack = spellAttackBonus(character)
  const cantrips = (character.spells_known ?? [])
    .map((link) => resolveSpellLink(index, link))
    .filter((s) => s?.frontmatter.level === 0)

  // On a Nimble-flavored sheet, `spellcasting.ability` is still the untouched D&D bridge ability
  // (see `CharacterFrontmatter.nimble_attributes`'s doc comment) — shown as its Nimble equivalent
  // here so this plate doesn't show a stray D&D letter amid an otherwise all-Nimble sheet.
  const abilityAbbr = character.nimble_attributes
    ? ABILITY_TO_NIMBLE_ATTRIBUTE[character.spellcasting.ability].toUpperCase()
    : character.spellcasting.ability.toUpperCase()

  return (
    <Card title={t('cards.attacksSpellcasting')}>
      <div className="mb-3 grid grid-cols-3 gap-2">
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
        <div className="mb-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-fg-muted">{t('stats.mana')}</div>
          <ManaVessel mana={character.spellcasting.mana} characterPath={characterPath} writeTarget={character._write?.mana_current} />
        </div>
      )}

      {character.spellcasting.slots && (
        <div className="mb-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-fg-muted">{t('stats.spellSlots')}</div>
          <SpellSlotTracker spellcasting={character.spellcasting} characterPath={characterPath} writeTargets={character._write?.spell_slots} />
        </div>
      )}

      {character.resource_pools && character.resource_pools.length > 0 && (
        <div className="mb-3 space-y-2">
          {character.resource_pools.map((pool) => (
            <ResourcePoolBar key={pool.name} pool={pool} />
          ))}
        </div>
      )}

      {cantrips.length > 0 && (
        <ul className="space-y-1 text-sm text-fg">
          {cantrips.map((c) => (
            <li key={c!.path} className="flex justify-between">
              <WikiLink target={c!.frontmatter.name} display={c!.frontmatter.name} />
              <span className="text-fg-muted">{c!.frontmatter.range}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
