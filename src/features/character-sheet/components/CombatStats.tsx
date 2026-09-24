import { useId } from 'react'
import { StatPlate } from '../../../components/StatPlate'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'
import { formatModifier, initiativeBonus, speedInSquares } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'

/** Armor class as a heater shield, the way tabletop-RPG sheets and game HUDs draw it. */
export function ArmorClass({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const gradientId = useId()

  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="relative h-[5.75rem] w-20 drop-shadow-[0_0_14px_color-mix(in_srgb,var(--color-trim)_45%,transparent)]">
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
        <span className="absolute inset-x-0 top-[1.55rem] text-center font-num text-3xl text-fg">{character.armor_class}</span>
      </div>
      <span className="mt-1 text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted">{t('stats.armorClass')}</span>
    </div>
  )
}

export function CombatStats({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const initiative = initiativeBonus(character)
  const squares = speedInSquares(character.speed)
  return (
    <div className="flex shrink-0 gap-2">
      <StatPlate label={t('stats.initiative')}>
        <D20RollButton
          label={t('stats.initiative')}
          modifier={initiative}
          className="cursor-pointer transition hover:text-trim"
        >
          {formatModifier(initiative)}
        </D20RollButton>
      </StatPlate>
      {squares === undefined ? (
        <StatPlate label={t('stats.speed')} value={character.speed} />
      ) : (
        <StatPlate
          label={t('stats.movement')}
          value={String(squares)}
          title={t('stats.movementHint', { count: squares, speed: character.speed })}
        />
      )}
      <StatPlate label={t('stats.profBonus')} value={formatModifier(character.proficiency_bonus)} />
    </div>
  )
}
