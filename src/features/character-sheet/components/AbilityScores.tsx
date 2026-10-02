import type { ReactNode } from 'react'
import { Card } from '../../../components/Card'
import { D20Modifier } from '../../../components/ExhaustedValue'
import { useExhaustedSync } from '../../../components/exhaustedSync'
import { useD20Penalty } from '../../../dice/d20Penalty'
import { D20RollButton } from '../../../dice/RollButton'
import type { RollMode } from '../../../dice/notation'
import { d20RollHint } from '../../../dice/rollHint'
import { useT } from '../../../i18n/useI18n'
import { useCanEdit, useVaultStore } from '../../../store/vaultStore'
import { abilityModifier, formatModifier, isSavingThrowProficient, nimbleAttributeValue, savingThrowBonus } from '../../../vault/deriveStats'
import { ABILITIES, NIMBLE_ATTRIBUTES, NIMBLE_SAVE_ATTRIBUTES, type CharacterFrontmatter } from '../../../vault/types'
import { ProficiencyDot } from './ProficiencyDot'

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
  save,
  muted = false,
  core = false,
}: {
  label: string
  abbr: string
  modifier: number
  caption?: string
  /** The attribute's saving-throw chip (`SaveChip`), or `null` for an attribute without a save — a
   * same-height gap then keeps the row aligned. */
  save?: ReactNode
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
      {save !== undefined && (save ?? <div className="mt-2 h-6" aria-hidden />)}
    </div>
  )
}

/**
 * The saving throw that goes with an attribute, as a chip under its medallion — it used to be a
 * card of its own that mostly repeated the attribute values. Clicking it rolls the save (with the
 * class's advantage/disadvantage, ▲/▼, in Nimble); the medallion above still rolls the plain check.
 * D&D saves keep their proficiency dot, a toggle while editing.
 */
function SaveChip({
  label,
  bonus,
  mode,
  proficient,
  onToggle,
}: {
  label: string
  bonus: number
  mode?: RollMode
  proficient?: boolean
  onToggle?: () => void
}) {
  const t = useT()
  const modeLabel = mode && mode !== 'normal' ? t(`roll.mode.${mode}`) : undefined
  const dot = proficient !== undefined && <ProficiencyDot active={proficient} />
  return (
    <div className="mt-2 flex h-6 items-center gap-1 rounded-full border border-trim/25 bg-surface/80 px-1.5 text-[0.7rem] transition hover:border-trim/60">
      {onToggle ? (
        <button type="button" aria-label={t('a11y.toggleSavingThrow', { label })} onClick={onToggle} className="cursor-pointer transition hover:opacity-70">
          {dot}
        </button>
      ) : (
        dot
      )}
      <D20RollButton
        label={t('roll.saveSuffix', { label })}
        modifier={bonus}
        mode={mode}
        note={modeLabel ? t('roll.classMode', { mode: modeLabel }) : undefined}
        className="flex cursor-pointer items-center gap-1 hover:text-trim"
      >
        <span className="font-semibold uppercase tracking-wider text-fg-muted">{t('short.save')}</span>
        <D20Modifier value={bonus} hint={false} className={`font-num ${proficient ? 'text-trim' : 'text-fg'}`} />
        {modeLabel && (
          <span className={mode === 'advantage' ? 'text-success' : 'text-danger'}>
            <span aria-hidden>{mode === 'advantage' ? '▲' : '▼'}</span>
            <span className="sr-only">{modeLabel}</span>
          </span>
        )}
      </D20RollButton>
    </div>
  )
}

export function AbilityScores({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const canEdit = useCanEdit()
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const nimble = character.nimble_attributes
  const primary = character.nimble_primary_attributes

  return (
    <Card title={t('cards.abilitiesAndSaves')}>
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
                  // Only six of the eight attributes back a save (`NIMBLE_SAVE_ATTRIBUTES`).
                  save={
                    NIMBLE_SAVE_ATTRIBUTES.includes(key) ? (
                      <SaveChip label={t(`nimbleAttribute.${key}`)} bonus={nimbleAttributeValue(character, key)} mode={character.nimble_save_modes?.[key]} />
                    ) : null
                  }
                />
              )
            })
          : ABILITIES.map(({ key }) => {
              const label = t(`ability.${key}`)
              const score = character.abilities[key]
              const proficient = isSavingThrowProficient(character, key)
              const target = character._write?.saving_throw_proficiencies?.[key]
              const toggle =
                canEdit && target
                  ? () => {
                      const next = !proficient
                      void updateCharacterField(characterPath, target, next ? 1 : 0, (c) => ({
                        ...c,
                        saving_throw_proficiencies: next
                          ? [...c.saving_throw_proficiencies.filter((k) => k !== key), key]
                          : c.saving_throw_proficiencies.filter((k) => k !== key),
                      }))
                    }
                  : undefined
              return (
                <AbilityMedallion
                  key={key}
                  label={label}
                  abbr={label.slice(0, 3)}
                  modifier={abilityModifier(score)}
                  caption={String(score)}
                  save={<SaveChip label={label} bonus={savingThrowBonus(character, key)} proficient={proficient} onToggle={toggle} />}
                />
              )
            })}
      </div>
    </Card>
  )
}
