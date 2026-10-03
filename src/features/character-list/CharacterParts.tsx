import type { ReactNode } from 'react'
import { initials } from '../../components/initials'
import { useT } from '../../i18n/useI18n'
import { exhaustionLevel, totalCharacterLevel } from '../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../vault/types'
import { ExhaustionGlyph } from '../character-sheet/components/VitalPools'
import { hpFillClass, maxExhaustion, percentOf, resiliencePool } from '../character-sheet/vitals'
import { ManaIcon } from '../spells/components/ManaIcon'

// Pieces of a party member shared by the card, the list row, the lineup and the comparison table.

/** A slim version of the sheet's vitals bar; `warded` adds the temp-HP ward like on the sheet. */
function MiniBar({
  icon,
  label,
  current,
  max,
  fillClass,
  warded,
}: {
  icon: ReactNode
  label: string
  current: number
  max: number
  fillClass: string
  warded: boolean
}) {
  return (
    <div className="flex items-center gap-2" title={`${label}: ${current}/${max}`}>
      {icon}
      <div
        className={`relative h-2 min-w-0 flex-1 overflow-hidden rounded-full border bg-black/35 shadow-[inset_0_1px_3px_rgb(0_0_0/0.55)] ${
          warded ? 'hp-warded border-accent/70' : 'border-trim/45'
        }`}
      >
        <div className={`h-full rounded-full transition-[width] ${fillClass}`} style={{ width: `${percentOf(current, max)}%` }} />
        {warded && <div className="hp-ward absolute inset-0" />}
      </div>
      <span className="w-11 text-right font-num text-xs text-fg">
        {current}
        <span className="text-fg-muted">/{max}</span>
      </span>
    </div>
  )
}

/** Portrait (or a monogram medallion) with the total level as a badge; `small` for the list rows. */
export function Portrait({ character: c, small = false }: { character: CharacterFrontmatter; small?: boolean }) {
  return (
    <div className="relative shrink-0">
      {c.portrait_url ? (
        <img
          src={c.portrait_url}
          alt=""
          className={`${small ? 'size-11' : 'size-16'} rounded-md border-2 border-trim object-cover shadow-[0_0_0_2px_var(--color-surface),0_0_16px_-4px_color-mix(in_srgb,var(--color-trim)_60%,transparent)] transition`}
        />
      ) : (
        <div aria-hidden className={`rpg-medallion font-display font-bold text-trim ${small ? '!size-11 text-base' : '!size-16 text-xl'}`}>
          {initials(c.name)}
        </div>
      )}
      <span
        className={`absolute -bottom-1.5 -right-1.5 flex items-center justify-center rounded-full border-2 border-trim bg-surface font-num font-bold ${
          small ? 'size-5 text-[0.6rem]' : 'size-6 text-xs'
        } text-trim shadow-[0_0_8px_color-mix(in_srgb,var(--color-trim)_55%,transparent)]`}
      >
        {totalCharacterLevel(c)}
      </span>
    </div>
  )
}

/** Resilience/HP (and mana, for casters with a pool) bars — same colours and ward as the sheet. The
 * card adds the temp-HP and exhaustion line below; the list row shows it beside the name instead. */
export function LifeForce({ character: c, withStatus = true }: { character: CharacterFrontmatter; withStatus?: boolean }) {
  const t = useT()
  const temp = c.hp.temp ?? 0
  const resilience = resiliencePool(c)
  const mana = c.spellcasting?.mana

  return (
    <div className="space-y-1.5">
      {resilience && (
        <MiniBar
          icon={<span aria-hidden className="w-3.5 text-center text-[0.7rem] text-trim">🔥</span>}
          label={t('stats.resilience')}
          current={resilience.current}
          max={resilience.max}
          fillClass="rp-fill"
          warded={temp > 0}
        />
      )}
      <MiniBar
        icon={<span aria-hidden className="w-3.5 text-center text-[0.7rem] text-danger">♥</span>}
        label={t('cards.hitPoints')}
        current={c.hp.current}
        max={c.hp.max}
        fillClass={`bg-linear-to-r ${hpFillClass(percentOf(c.hp.current, c.hp.max))}`}
        warded={temp > 0}
      />
      {mana && (
        <MiniBar
          icon={<ManaIcon />}
          label={t('stats.mana')}
          current={mana.current}
          max={mana.max}
          fillClass="mana-fill"
          warded={false}
        />
      )}
      {withStatus && <VitalStatus character={c} />}
    </div>
  )
}

/** Temp HP and exhaustion tokens; renders nothing while neither applies. `spread` pins exhaustion to
 * the right edge (card), otherwise both sit side by side (list row). `tokensOnly` drops the
 * exhaustion label (still in the tooltip) where space is tight (lineup). */
export function VitalStatus({
  character: c,
  spread = true,
  tokensOnly = false,
  className = '',
}: {
  character: CharacterFrontmatter
  spread?: boolean
  tokensOnly?: boolean
  className?: string
}) {
  const t = useT()
  const temp = c.hp.temp ?? 0
  const exhaustion = exhaustionLevel(c)
  const exhaustionMax = maxExhaustion(c)
  if (temp === 0 && exhaustion === 0) return null

  return (
    <div className={`flex items-center gap-2 text-[0.7rem] ${className}`}>
      {temp > 0 && (
        <span className="font-semibold text-accent" title={t('stats.tempHp')}>
          🛡 +{temp} {t('stats.temp')}
        </span>
      )}
      {exhaustion > 0 && (
        <span className={`flex items-center gap-1 font-semibold text-danger ${spread ? 'ml-auto' : ''}`} title={`${t('stats.exhaustion')}: ${exhaustion}/${exhaustionMax}`}>
          {!tokensOnly && t('stats.exhaustion')}
          <span className="flex">
            {Array.from({ length: exhaustionMax }, (_, i) => {
              const skull = i === exhaustionMax - 1
              return (
                <span key={i} className={`exh-token size-3.5 ${i < exhaustion ? 'is-filled' : ''} ${skull ? 'is-skull' : ''}`}>
                  <ExhaustionGlyph skull={skull} />
                </span>
              )
            })}
          </span>
        </span>
      )}
    </div>
  )
}

export function FallenSeal({ dead }: { dead: boolean }) {
  const t = useT()
  return (
    <span className="card-fallen-seal shrink-0">
      <span aria-hidden>{dead ? '☠' : '🩸'}</span>
      {dead ? t('characterList.dead') : t('characterList.fallen')}
    </span>
  )
}
