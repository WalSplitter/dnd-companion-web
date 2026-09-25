import type { ReactNode } from 'react'
import { D20Modifier, ExhaustedValue } from '../../components/ExhaustedValue'
import { D20PenaltyContext } from '../../dice/d20Penalty'
import { useT } from '../../i18n/useI18n'
import {
  abilityModifier,
  classSummary,
  evasionValue,
  exhaustionD20Penalty,
  exhaustionLevel,
  formatModifier,
  initiativeBonus,
  movementSquares,
  nimbleAttributeValue,
  nimbleSkillBonus,
  nimbleSkillValue,
  skillBonus,
  skillProficiencyLevel,
  totalCharacterLevel,
} from '../../vault/deriveStats'
import { ABILITIES, NIMBLE_ATTRIBUTES, SKILLS, type CharacterFrontmatter, type SkillKey } from '../../vault/types'
import { characterFate, hpFillClass, maxExhaustion, movementHint, percentOf, resiliencePool } from '../character-sheet/vitals'

/** How many of a character's best skills the card lists. */
const TOP_SKILL_COUNT = 3

const PROFICIENCY_RANK = { none: 0, proficient: 1, expertise: 2 } as const

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** The trained skills worth showing off: Nimble skills by trained value, D&D skills by proficiency
 * (expertise first), each with its total roll bonus. */
function topSkills(character: CharacterFrontmatter): { key: SkillKey; bonus: number }[] {
  const nimble = Boolean(character.nimble_attributes)
  return SKILLS.map(({ key }) => ({
    key,
    rank: nimble ? nimbleSkillValue(character, key) : PROFICIENCY_RANK[skillProficiencyLevel(character, key)],
    bonus: nimble ? nimbleSkillBonus(character, key) : skillBonus(character, key),
  }))
    .filter((s) => s.rank > 0)
    .sort((a, b) => b.rank - a.rank || b.bonus - a.bonus)
    .slice(0, TOP_SKILL_COUNT)
}

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

/** Small engraved tile for one headline stat. */
function StatTile({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <div title={title} className="rpg-plate flex flex-col items-center justify-center px-1 py-1 text-center">
      <span className="font-num text-base leading-tight text-fg">{children}</span>
      <span className="text-[0.58rem] font-semibold uppercase tracking-wider text-fg-muted">{label}</span>
    </div>
  )
}

/** Portrait (or a monogram medallion) with the total level as a badge. */
function Portrait({ character: c }: { character: CharacterFrontmatter }) {
  return (
    <div className="relative shrink-0">
      {c.portrait_url ? (
        <img
          src={c.portrait_url}
          alt=""
          className="size-16 rounded-md border-2 border-trim object-cover shadow-[0_0_0_2px_var(--color-surface),0_0_16px_-4px_color-mix(in_srgb,var(--color-trim)_60%,transparent)] transition"
        />
      ) : (
        <div aria-hidden className="rpg-medallion !size-16 font-display text-xl font-bold text-trim">
          {initials(c.name)}
        </div>
      )}
      <span className="absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border-2 border-trim bg-surface font-num text-xs font-bold text-trim shadow-[0_0_8px_color-mix(in_srgb,var(--color-trim)_55%,transparent)]">
        {totalCharacterLevel(c)}
      </span>
    </div>
  )
}

/** Resilience/HP bars plus the temp-HP and exhaustion line — same colours and ward as the sheet. */
function LifeForce({ character: c }: { character: CharacterFrontmatter }) {
  const t = useT()
  const temp = c.hp.temp ?? 0
  const resilience = resiliencePool(c)
  const exhaustion = exhaustionLevel(c)
  const exhaustionMax = maxExhaustion(c)

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
      {(temp > 0 || exhaustion > 0) && (
        <div className="flex items-center justify-between gap-2 text-[0.7rem]">
          {temp > 0 ? (
            <span className="font-semibold text-accent" title={t('stats.tempHp')}>
              🛡 +{temp} {t('stats.temp')}
            </span>
          ) : (
            <span />
          )}
          {exhaustion > 0 && (
            <span className="flex items-center gap-1 font-semibold text-danger" title={`${t('stats.exhaustion')}: ${exhaustion}/${exhaustionMax}`}>
              {t('stats.exhaustion')}
              <span className="flex gap-0.5">
                {Array.from({ length: exhaustionMax }, (_, i) => (
                  <span key={i} className={`size-1.5 rounded-full ${i < exhaustion ? 'bg-danger shadow-[0_0_4px_var(--color-danger)]' : 'bg-fg-muted/25'}`} />
                ))}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function HeadlineStats({ character: c }: { character: CharacterFrontmatter }) {
  const t = useT()
  const evasion = evasionValue(c)
  const squares = movementSquares(c)

  return (
    <div className="grid grid-cols-4 gap-1.5">
      <StatTile label={t('short.armorClass')} title={t('stats.armorClass')}>
        {c.armor_class}
      </StatTile>
      {evasion !== undefined ? (
        <StatTile label={t('short.evasion')} title={t('stats.evasion')}>
          {evasion}
        </StatTile>
      ) : (
        <StatTile label={t('short.profBonus')} title={t('stats.profBonus')}>
          {formatModifier(c.proficiency_bonus)}
        </StatTile>
      )}
      <StatTile label={t('short.initiative')} title={t('stats.initiative')}>
        <D20Modifier value={initiativeBonus(c)} />
      </StatTile>
      {squares !== undefined ? (
        <StatTile label={t('short.movement')} title={movementHint(t, c, squares)}>
          {exhaustionLevel(c) > 0 ? <ExhaustedValue>{squares}</ExhaustedValue> : squares}
        </StatTile>
      ) : (
        <StatTile label={t('short.speed')} title={t('stats.speed')}>
          <span className="text-xs">{c.speed}</span>
        </StatTile>
      )}
    </div>
  )
}

function AttributeRow({ character: c }: { character: CharacterFrontmatter }) {
  const t = useT()
  return (
    <div className={`grid gap-1 border-t border-trim/15 pt-2.5 ${c.nimble_attributes ? 'grid-cols-8' : 'grid-cols-6'}`}>
      {c.nimble_attributes
        ? NIMBLE_ATTRIBUTES.map(({ key }) => {
            const primary = c.nimble_primary_attributes?.includes(key)
            return (
              <div key={key} className="text-center" title={t(`nimbleAttribute.${key}`)}>
                <div className={`text-[0.58rem] font-semibold uppercase tracking-wider ${primary ? 'text-trim' : 'text-fg-muted'}`}>{key}</div>
                <div className="font-num text-sm text-fg">{formatModifier(nimbleAttributeValue(c, key))}</div>
              </div>
            )
          })
        : ABILITIES.map(({ key }) => {
            const label = t(`ability.${key}`)
            return (
              <div key={key} className="text-center" title={`${label} ${c.abilities[key]}`}>
                <div className="text-[0.58rem] font-semibold uppercase tracking-wider text-fg-muted">{label.slice(0, 3)}</div>
                <div className="font-num text-sm text-fg">{formatModifier(abilityModifier(c.abilities[key]))}</div>
              </div>
            )
          })}
    </div>
  )
}

/** Best skills and spell slots, only when there are any. */
function Highlights({ character: c }: { character: CharacterFrontmatter }) {
  const t = useT()
  const skills = topSkills(c)
  const slots = Object.entries(c.spellcasting?.slots ?? {})
  if (skills.length === 0 && slots.length === 0) return null

  return (
    <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-trim/15 pt-2.5">
      {skills.map(({ key, bonus }) => (
        <span key={key} title={t('characterList.topSkills')} className="rounded-full border border-trim/30 bg-trim/[0.07] px-2 py-0.5 text-[0.68rem] text-fg">
          {t(`skill.${key}`)} <D20Modifier value={bonus} className="font-num font-bold text-trim" />
        </span>
      ))}
      {slots.map(([grade, slot]) => (
        <span
          key={grade}
          title={`${t('stats.spellSlots')} ${grade}: ${slot.max - slot.used}/${slot.max}`}
          className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[0.62rem] text-fg-muted"
        >
          {t('short.spellGrade', { grade: grade.replace(/\D/g, '') || grade })}
          <span className="flex gap-0.5">
            {Array.from({ length: slot.max }, (_, i) => (
              <span key={i} className={`size-1.5 rounded-full ${i < slot.max - slot.used ? 'bg-trim' : 'border border-trim/40'}`} />
            ))}
          </span>
        </span>
      ))}
    </div>
  )
}

/** One character on the list page. It sits outside the sheet, so it provides the character's own
 * exhaustion penalty for the d20 values it shows (see `D20PenaltyContext`). */
export function CharacterCard({ character }: { character: CharacterFrontmatter }) {
  return (
    <D20PenaltyContext value={exhaustionD20Penalty(character)}>
      <CharacterCardBody character={character} />
    </D20PenaltyContext>
  )
}

function CharacterCardBody({ character: c }: { character: CharacterFrontmatter }) {
  const t = useT()
  const fate = characterFate(c)
  const fallen = fate !== 'alive'
  const dead = fate === 'dead'
  const origin = [c.species, c.background, c.alignment].filter(Boolean).join(' · ')

  return (
    <div
      className={`rpg-panel group relative flex h-full flex-col gap-3 p-4 transition duration-200 hover:-translate-y-1 ${
        fallen ? `card-fallen hover:shadow-[0_0_28px_-6px_rgb(200_0_0/0.7)] ${dead ? 'is-dead' : ''}` : 'hover:shadow-[0_0_24px_-6px_var(--color-trim)]'
      }`}
    >
      {/* Fallen: the sheet's grey veil and blood vignette over the card */}
      {fallen && (
        <>
          {dead && (
            <span aria-hidden className="card-fallen-skull">
              ☠
            </span>
          )}
          <div aria-hidden className="card-fallen-veil" />
        </>
      )}

      <div className="flex items-start gap-3">
        <Portrait character={c} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate font-display text-lg font-bold tracking-wide text-fg">{c.name}</div>
            {fallen && (
              <span className="card-fallen-seal shrink-0">
                <span aria-hidden>{dead ? '☠' : '🩸'}</span>
                {dead ? t('characterList.dead') : t('characterList.fallen')}
              </span>
            )}
          </div>
          <span className="mt-1 inline-block max-w-full truncate rounded-full border border-trim/40 bg-trim/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-trim">
            {classSummary(c)}
          </span>
          {origin && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted">
              <span aria-hidden className="size-1 shrink-0 rotate-45 bg-trim/60" />
              <span className="truncate">{origin}</span>
            </div>
          )}
        </div>
      </div>

      <LifeForce character={c} />
      <HeadlineStats character={c} />
      <AttributeRow character={c} />
      <Highlights character={c} />
    </div>
  )
}
