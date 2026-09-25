import { useId } from 'react'
import { D20Modifier, ExhaustedValue } from '../../../components/ExhaustedValue'
import { StatPlate } from '../../../components/StatPlate'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'
import { evasionValue, exhaustionLevel, formatModifier, initiativeBonus, movementSquares, nimbleAttributeValue } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'
import { wikilinkTarget } from '../../../vault/wikilinkSyntax'
import { movementHint } from '../vitals'

/** Armor class as a heater shield, the way tabletop-RPG sheets and game HUDs draw it. */
export function ArmorClass({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const gradientId = useId()

  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="relative h-[4.6rem] w-16 drop-shadow-[0_0_14px_color-mix(in_srgb,var(--color-trim)_45%,transparent)]">
        <svg viewBox="0 0 100 116" className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--color-trim) 30%, var(--color-surface-2))' }} />
              <stop offset="1" style={{ stopColor: 'var(--color-surface)' }} />
            </linearGradient>
          </defs>
          <path
            d="M50 4 L92 16 V58 C92 86 72 104 50 113 C28 104 8 86 8 58 V16 Z"
            strokeWidth="4"
            strokeLinejoin="round"
            style={{ fill: `url(#${gradientId})`, stroke: 'var(--color-trim)' }}
          />
          <path
            d="M50 13 L84 22.5 V58 C84 81 68 96 50 104 C32 96 16 81 16 58 V22.5 Z"
            fill="none"
            strokeWidth="1"
            style={{ stroke: 'color-mix(in srgb, var(--color-trim) 50%, transparent)' }}
          />
        </svg>
        <span className="absolute inset-x-0 top-[1.2rem] text-center font-num text-2xl text-fg">{character.armor_class}</span>
      </div>
      <span className="mt-1 text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted">{t('stats.armorClass')}</span>
    </div>
  )
}

/**
 * Nimble evasion value as a diamond medallion with motion streaks on either side, a sidestep to the
 * armor class's shield. The tooltip spells out the formula and the dodge reaction's bonus.
 */
export function Evasion({ value, character }: { value: number; character: CharacterFrontmatter }) {
  const t = useT()
  const bw = nimbleAttributeValue(character, 'bw')
  const capped = character.bw_cap !== undefined && character.bw_cap < bw
  const hint = t(capped ? 'stats.evasionHintCapped' : 'stats.evasionHint', {
    bw: formatModifier(bw),
    cap: formatModifier(character.bw_cap ?? 0),
    armor: character.armor ? wikilinkTarget(character.armor) : '',
  })

  return (
    <div className="evasion flex shrink-0 flex-col items-center" title={hint}>
      <div className="relative h-12 w-[4.5rem]">
        <svg viewBox="0 0 120 80" className="absolute inset-0 size-full" aria-hidden>
          <g className="evasion-streaks" stroke="var(--color-trim)" strokeLinecap="round" fill="none">
            <path d="M6 30h18M2 40h24M8 50h16" strokeWidth="2" opacity="0.55" />
            <path d="M96 30h18M94 40h24M96 50h16" strokeWidth="2" opacity="0.55" />
          </g>
          <path
            d="M60 3 97 40 60 77 23 40Z"
            strokeWidth="3.5"
            strokeLinejoin="round"
            style={{
              fill: 'color-mix(in srgb, var(--color-trim) 18%, var(--color-surface))',
              stroke: 'var(--color-trim)',
            }}
          />
          <path
            d="M60 11 89 40 60 69 31 40Z"
            fill="none"
            strokeWidth="1"
            style={{ stroke: 'color-mix(in srgb, var(--color-trim) 50%, transparent)' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-num text-xl text-fg">{value}</span>
      </div>
      <span className="mt-1 text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted">{t('stats.evasion')}</span>
    </div>
  )
}

export function CombatStats({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const initiative = initiativeBonus(character)
  const squares = movementSquares(character)
  const exhaustion = exhaustionLevel(character)
  return (
    <div className="flex gap-2 *:flex-1">
      <StatPlate label={t('stats.initiative')}>
        <D20RollButton
          label={t('stats.initiative')}
          modifier={initiative}
          className="cursor-pointer transition hover:text-trim"
        >
          <D20Modifier value={initiative} hint={false} />
        </D20RollButton>
      </StatPlate>
      {squares === undefined ? (
        <StatPlate label={t('stats.speed')} value={character.speed} />
      ) : (
        <StatPlate label={t('stats.movement')} value={exhaustion > 0 ? undefined : String(squares)} title={movementHint(t, character, squares)}>
          {exhaustion > 0 ? <ExhaustedValue>{squares}</ExhaustedValue> : undefined}
        </StatPlate>
      )}
      {/* Nimble has no proficiency bonus in play; its evasion value sits by the armor class instead. */}
      {evasionValue(character) === undefined && (
        <StatPlate label={t('stats.profBonus')} value={formatModifier(character.proficiency_bonus)} />
      )}
    </div>
  )
}
