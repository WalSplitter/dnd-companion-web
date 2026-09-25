import { Card } from '../../../components/Card'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'
import { abilityModifier, formatModifier, nimbleAttributeValue } from '../../../vault/deriveStats'
import { ABILITIES, NIMBLE_ATTRIBUTES, type CharacterFrontmatter } from '../../../vault/types'

/** A medallion + caption plate, shared by the D&D-shaped `abilities` and Nimble `nimble_attributes`
 * branches below. The value itself is never edited here (attributes are set by the DM), but the
 * medallion is a roll button for a plain attribute check: W20 + the shown modifier
 * (`Attribute#Attributswurf`). */
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
  const displayValue = formatModifier(modifier)
  return (
    <div className="flex flex-col items-center text-center" title={label}>
      <span className="mb-2 font-display text-[0.7rem] font-bold uppercase tracking-[0.18em] text-fg-muted">{abbr}</span>
      <D20RollButton
        label={t('roll.checkSuffix', { label })}
        modifier={modifier}
        title={t('roll.checkHint', { label, modifier: displayValue, hint: t('roll.tooltipD20') })}
        className="rpg-medallion-roll cursor-pointer rounded-full"
      >
        <span className={`rpg-medallion ${muted ? 'rpg-medallion-muted' : ''}`}>
          <span className={`font-num text-2xl ${muted ? 'text-fg-muted' : 'text-fg'}`}>{displayValue}</span>
        </span>
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
