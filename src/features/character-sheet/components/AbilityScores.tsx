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
 * attribute and gets a bleeding rim, while blood pools up inside it from below (a little higher per
 * exhaustion level) with the actual roll value floating in it. One tooltip on the whole block
 * explains both.
 *
 * A class's core attribute (`core`) wears a twinkling star crest on its rim and a comet of light
 * circling it; every other Nimble attribute is simply the dimmed (`muted`) medallion. */
function AbilityMedallion({
  label,
  abbr,
  modifier,
  caption,
  muted = false,
  core = false,
}: {
  label: string
  abbr: string
  modifier: number
  caption?: string
  muted?: boolean
  core?: boolean
}) {
  const t = useT()
  const penalty = useD20Penalty()
  const exhausted = penalty > 0
  const sync = useExhaustedSync()
  const displayValue = formatModifier(modifier)
  const rollValue = formatModifier(modifier - penalty)
  const rollHint = exhausted
    ? t('exhaustion.checkHint', { label, total: rollValue, base: displayValue, n: penalty, hint: t('roll.tooltipD20') })
    : d20RollHint(t, t('roll.checkSuffix', { label }), modifier, 0)
  const hint = core ? `${rollHint}. ${t('attribute.coreHint')}` : rollHint
  return (
    <div className="flex flex-col items-center text-center" title={hint}>
      <span className={`mb-3 font-display text-[0.7rem] font-bold uppercase tracking-[0.18em] ${core ? 'text-trim' : 'text-fg-muted'}`}>{abbr}</span>
      <D20RollButton
        label={t('roll.checkSuffix', { label })}
        modifier={modifier}
        title={false}
        className="rpg-medallion-roll relative cursor-pointer rounded-full"
      >
        {core && <span className="core-halo" aria-hidden />}
        <span className={`rpg-medallion ${muted ? 'rpg-medallion-muted' : ''} ${exhausted ? 'is-exhausted' : ''}`} style={exhausted ? sync : undefined}>
          <span className={`relative z-[1] font-num text-2xl ${exhausted ? '-mt-2' : ''} ${muted ? 'text-fg-muted' : 'text-fg'}`}>{displayValue}</span>
          {exhausted && (
            <span className="exhausted-pool" style={{ '--pool-level': Math.min(6, Math.ceil(penalty / 2)) } as React.CSSProperties}>
              <span className="exhausted-pool-value">{rollValue}</span>
            </span>
          )}
        </span>
        {core && (
          <span className="core-crest" aria-hidden>
            <svg viewBox="0 0 24 24">
              <path d="M12 1.5 14.2 9.8 22.5 12 14.2 14.2 12 22.5 9.8 14.2 1.5 12 9.8 9.8Z" className="core-crest-star" />
              <path d="M12 7.5 12.9 11.1 16.5 12 12.9 12.9 12 16.5 11.1 12.9 7.5 12 11.1 11.1Z" className="core-crest-glint" />
            </svg>
          </span>
        )}
        {core && <span className="sr-only">{t('attribute.coreHint')}</span>}
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
                  core={isPrimary}
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
