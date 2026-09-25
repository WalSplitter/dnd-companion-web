import { Card } from '../../../components/Card'
import { useExhaustedSync } from '../../../components/exhaustedSync'
import { useD20Penalty } from '../../../dice/d20Penalty'
import { D20RollButton } from '../../../dice/RollButton'
import { d20RollHint } from '../../../dice/rollHint'
import { useT } from '../../../i18n/useI18n'
import { abilityModifier, formatModifier, nimbleAttributeValue } from '../../../vault/deriveStats'
import { ABILITIES, NIMBLE_ATTRIBUTES, type CharacterFrontmatter } from '../../../vault/types'

/** A medallion + caption plate, shared by the D&D-shaped `abilities` and Nimble `nimble_attributes`
 * branches below. The value itself is never edited here (attributes are set by the DM), but the
 * medallion is a roll button for a plain attribute check: W20 + the shown modifier
 * (`Attribute#Attributswurf`).
 *
 * Exhaustion never changes the attribute itself (it stays within −5…+5, and rules like the evasion
 * value or TP per level read it unchanged) — only the roll. So the medallion keeps showing the
 * attribute and gets a bleeding rim, and a blood-drop seal hanging off its edge shows the actual
 * roll value. One tooltip on the whole block explains both. */
function AbilityMedallion({
  label,
  abbr,
  modifier,
  caption,
  muted = false,
}: {
  label: string
  abbr: string
  modifier: number
  caption?: string
  muted?: boolean
}) {
  const t = useT()
  const penalty = useD20Penalty()
  const exhausted = penalty > 0
  const sync = useExhaustedSync()
  const displayValue = formatModifier(modifier)
  const rollValue = formatModifier(modifier - penalty)
  const hint = exhausted
    ? t('exhaustion.checkHint', { label, total: rollValue, base: displayValue, n: penalty, hint: t('roll.tooltipD20') })
    : d20RollHint(t, t('roll.checkSuffix', { label }), modifier, 0)
  return (
    <div className="flex flex-col items-center text-center" title={hint}>
      <span className="mb-2 font-display text-[0.7rem] font-bold uppercase tracking-[0.18em] text-fg-muted">{abbr}</span>
      <D20RollButton
        label={t('roll.checkSuffix', { label })}
        modifier={modifier}
        title={false}
        className="rpg-medallion-roll relative cursor-pointer rounded-full"
      >
        <span className={`rpg-medallion ${muted ? 'rpg-medallion-muted' : ''} ${exhausted ? 'is-exhausted' : ''}`} style={exhausted ? sync : undefined}>
          <span className={`font-num text-2xl ${muted ? 'text-fg-muted' : 'text-fg'}`}>{displayValue}</span>
        </span>
        {exhausted && (
          <span className="exhausted-seal" style={sync}>
            <svg viewBox="0 0 24 30" aria-hidden>
              <path d="M12 1.2C8.4 7.3 3.6 11.6 3.6 18a8.4 8.4 0 0 0 16.8 0c0-6.4-4.8-10.7-8.4-16.8Z" className="exhausted-seal-body" />
              <path d="M9.6 7.6c-1.3 1.8-2.3 3.4-2.8 5" className="exhausted-seal-shine" />
            </svg>
            <span className="exhausted-seal-value">{rollValue}</span>
          </span>
        )}
      </D20RollButton>
      {caption && (
        <div className="rpg-plate relative -mt-2.5 px-2 py-0.5">
          <span className={`text-[0.6rem] font-semibold uppercase tracking-wider ${muted ? 'text-fg-muted' : 'text-trim'}`}>{caption}</span>
        </div>
      )}
    </div>
  )
}

export function AbilityScores({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const nimble = character.nimble_attributes
  const primary = character.nimble_primary_attributes

  return (
    <Card title={t('cards.abilityScores')}>
      {/* 8 Nimble attributes lay out cleanly as 2 rows of 4; the 6 D&D abilities as 2 rows of 3. */}
      <div className={`grid gap-x-2 gap-y-5 pb-1 pt-1 ${nimble ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {nimble
          ? NIMBLE_ATTRIBUTES.map(({ key }) => {
              const isPrimary = primary?.includes(key)
              return (
                <AbilityMedallion
                  key={key}
                  label={t(`nimbleAttribute.${key}`)}
                  abbr={key.toUpperCase()}
                  modifier={nimbleAttributeValue(character, key)}
                  caption={primary ? t(isPrimary ? 'attribute.primary' : 'attribute.secondary') : undefined}
                  muted={!!primary && !isPrimary}
                />
              )
            })
          : ABILITIES.map(({ key }) => {
              const label = t(`ability.${key}`)
              const score = character.abilities[key]
              return (
                <AbilityMedallion
                  key={key}
                  label={label}
                  abbr={label.slice(0, 3)}
                  modifier={abilityModifier(score)}
                  caption={String(score)}
                />
              )
            })}
      </div>
    </Card>
  )
}
