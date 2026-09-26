import { Card } from '../../../components/Card'
import { D20Modifier } from '../../../components/ExhaustedValue'
import { useD20Penalty } from '../../../dice/d20Penalty'
import { D20RollButton, DamageRollButton } from '../../../dice/RollButton'
import { CaptionedRoll, DieIcon, HitIcon, ROLL_BUTTON } from '../../../dice/RollGlyphs'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import { evasionValue, formatModifier } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'

const KIND_KEY: Record<string, TranslationKey> = {
  melee: 'weaponKind.melee',
  ranged: 'weaponKind.ranged',
  thrown: 'weaponKind.thrown',
}

export function Attacks({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const penalty = useD20Penalty()
  const attacks = character.attacks
  if (!attacks || attacks.length === 0) return null

  // Endeavour attacks target the evasion value, D&D ones the armor class.
  const attackNote = t('roll.attackNote', { target: t(evasionValue(character) !== undefined ? 'stats.evasion' : 'stats.armorClass') })
  const damageNote = t(penalty > 0 ? 'roll.damageNoteExhausted' : 'roll.damageNote')

  return (
    <Card title={t('cards.attacks')}>
      <ul className="space-y-2">
        {attacks.map((attack) => (
          <li key={attack.name} className="rpg-plate p-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-display font-bold tracking-wide text-fg">{attack.name}</span>
              <span className="rounded-sm bg-trim/15 px-1.5 py-px text-[0.65rem] font-medium uppercase tracking-wider text-trim">{t(KIND_KEY[attack.kind])}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              <span className="text-xs text-fg-muted">
                {attack.range}
                {attack.properties && attack.properties.length > 0 && ` (${attack.properties.join(', ')})`}
              </span>
              <span className="flex items-start gap-1.5">
                <CaptionedRoll caption={t('roll.attackCaption')}>
                  <D20RollButton label={t('roll.attackSuffix', { name: attack.name })} modifier={attack.attack_bonus} note={attackNote} className={ROLL_BUTTON}>
                    <HitIcon />
                    <D20Modifier value={attack.attack_bonus} hint={false} />
                  </D20RollButton>
                </CaptionedRoll>
                <CaptionedRoll caption={t('roll.damageCaption')}>
                  <DamageRollButton
                    label={t('roll.damageSuffix', { name: attack.name })}
                    dice={attack.damage_dice}
                    bonus={attack.damage_bonus}
                    damageType={attack.damage_type}
                    note={damageNote}
                    className={ROLL_BUTTON}
                  >
                    <DieIcon formula={attack.damage_dice} />
                    {attack.damage_dice}
                    {attack.damage_bonus ? formatModifier(attack.damage_bonus) : ''}
                  </DamageRollButton>
                </CaptionedRoll>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
