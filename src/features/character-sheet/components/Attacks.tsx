import type { ReactNode } from 'react'
import { Card } from '../../../components/Card'
import { D20Modifier } from '../../../components/ExhaustedValue'
import { useD20Penalty } from '../../../dice/d20Penalty'
import { D20RollButton, DamageRollButton } from '../../../dice/RollButton'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import { evasionValue, formatModifier } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'

/** The default roll-button look, laid out for an icon in front of the value. */
const ROLL_BUTTON =
  'inline-flex cursor-pointer items-center gap-1 rounded-md border border-trim/30 bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-fg-muted transition hover:border-trim hover:text-trim hover:shadow-[0_0_10px_-3px_var(--color-trim)]'

const KIND_KEY: Record<string, TranslationKey> = {
  melee: 'weaponKind.melee',
  ranged: 'weaponKind.ranged',
  thrown: 'weaponKind.thrown',
}

/** Crosshair: the attack roll decides whether you hit. */
function HitIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-trim" aria-hidden>
      <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1v3.5M8 11.5V15M1 8h3.5M11.5 8H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    </svg>
  )
}

/** Impact burst: the damage roll says how hard it lands. */
function ImpactIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-orange-400" aria-hidden>
      <path fill="currentColor" d="m8 .8 1.5 4.3 4.3-1.6-2.4 3.9 3.8 2.3-4.5.4.6 4.5L8 11.3l-3.3 3.3.6-4.5-4.5-.4 3.8-2.3-2.4-3.9 4.3 1.6Z" />
    </svg>
  )
}

/** A roll button with a tiny caption underneath, so attack and damage read apart at a glance. */
function CaptionedRoll({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <span className="flex flex-col items-center gap-0.5">
      {children}
      <span className="text-[0.55rem] font-semibold uppercase leading-none tracking-wider text-fg-muted">{caption}</span>
    </span>
  )
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
                    <ImpactIcon />
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
