import { useId, type ReactNode } from 'react'
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
  proficiencyBonus,
  skillBonus,
  skillProficiencyLevel,
  totalCharacterLevel,
} from '../../vault/deriveStats'
import { ABILITIES, NIMBLE_ATTRIBUTES, SKILLS, type CharacterFrontmatter, type SkillKey } from '../../vault/types'
import { ExhaustionGlyph } from '../character-sheet/components/VitalPools'
import { characterFate, hpFillClass, maxExhaustion, movementHint, percentOf, resiliencePool } from '../character-sheet/vitals'
import { CrystalGradient, SlotCrystal } from '../spells/components/SpellSlotTracker'

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

/** Portrait (or a monogram medallion) with the total level as a badge; `small` for the list rows. */
function Portrait({ character: c, small = false }: { character: CharacterFrontmatter; small?: boolean }) {
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
function LifeForce({ character: c, withStatus = true }: { character: CharacterFrontmatter; withStatus?: boolean }) {
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
          icon={
            <svg aria-hidden viewBox="0 0 16 16" className="mana-caption size-3.5">
              <circle cx="8" cy="8.5" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path d="M3.1 9.1q2.4-1.2 4.9 0t4.9 0A4.9 4.9 0 0 1 3.1 9.1Z" fill="currentColor" />
            </svg>
          }
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
 * the right edge (card), otherwise both sit side by side (list row). */
function VitalStatus({ character: c, spread = true, className = '' }: { character: CharacterFrontmatter; spread?: boolean; className?: string }) {
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
          {t('stats.exhaustion')}
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

function HeadlineStats({ character: c, className = '' }: { character: CharacterFrontmatter; className?: string }) {
  const t = useT()
  const evasion = evasionValue(c)
  const squares = movementSquares(c)

  return (
    <div className={`grid grid-cols-4 gap-1.5 ${className}`}>
      <StatTile label={t('short.armorClass')} title={t('stats.armorClass')}>
        {c.armor_class}
      </StatTile>
      {evasion !== undefined ? (
        <StatTile label={t('short.evasion')} title={t('stats.evasion')}>
          {evasion}
        </StatTile>
      ) : (
        <StatTile label={t('short.profBonus')} title={t('stats.profBonus')}>
          {formatModifier(proficiencyBonus(c))}
        </StatTile>
      )}
      {/* Nimble: the turn-order roll (IN); the AP roll lives on the sheet. */}
      <StatTile label={t('short.initiative')} title={c.nimble_attributes ? t('stats.initiativeOrderNote') : t('stats.initiative')}>
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
  const gradientId = useId()
  if (skills.length === 0 && slots.length === 0) return null

  return (
    <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-trim/15 pt-2.5">
      {slots.length > 0 && <CrystalGradient id={gradientId} />}
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
          <span className="flex">
            {Array.from({ length: slot.max }, (_, i) => {
              const charged = i < slot.max - slot.used
              return (
                <span key={i} className={`spell-slot-gem !size-3.5 !p-0 ${charged ? 'is-charged' : 'is-spent'}`}>
                  <SlotCrystal charged={charged} gradientId={gradientId} />
                </span>
              )
            })}
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

function FallenSeal({ dead }: { dead: boolean }) {
  const t = useT()
  return (
    <span className="card-fallen-seal shrink-0">
      <span aria-hidden>{dead ? '☠' : '🩸'}</span>
      {dead ? t('characterList.dead') : t('characterList.fallen')}
    </span>
  )
}

function CharacterCardBody({ character: c }: { character: CharacterFrontmatter }) {
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
            {fallen && <FallenSeal dead={dead} />}
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

/** One character as a dense list row — the same vitals and headline stats as the card, without the
 * attributes and skill highlights, so a large party fits on one screen. Wraps to three lines on phones. */
export function CharacterRow({ character }: { character: CharacterFrontmatter }) {
  return (
    <D20PenaltyContext value={exhaustionD20Penalty(character)}>
      <CharacterRowBody character={character} />
    </D20PenaltyContext>
  )
}

function CharacterRowBody({ character: c }: { character: CharacterFrontmatter }) {
  const fate = characterFate(c)
  const fallen = fate !== 'alive'
  const dead = fate === 'dead'
  const origin = [c.species, c.background].filter(Boolean).join(' · ')

  return (
    <div
      className={`rpg-panel relative flex flex-wrap items-center gap-x-4 gap-y-2.5 px-3 py-2.5 transition duration-200 ${
        fallen ? `card-fallen hover:shadow-[0_0_20px_-6px_rgb(200_0_0/0.7)] ${dead ? 'is-dead' : ''}` : 'hover:shadow-[0_0_18px_-6px_var(--color-trim)]'
      }`}
    >
      {fallen && <div aria-hidden className="card-fallen-veil" />}

      <div className="flex min-w-0 flex-1 basis-64 items-center gap-3 lg:w-80 lg:flex-none">
        <Portrait character={c} small />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-base font-bold tracking-wide text-fg">{c.name}</span>
            {fallen && <FallenSeal dead={dead} />}
          </div>
          <div className="flex min-w-0 items-center gap-2 text-xs text-fg-muted">
            <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wider text-trim">{classSummary(c)}</span>
            {origin && <span className="truncate">{origin}</span>}
          </div>
          <VitalStatus character={c} spread={false} className="mt-0.5" />
        </div>
      </div>

      <div className="w-full sm:w-52 sm:flex-none lg:w-auto lg:flex-1">
        <LifeForce character={c} withStatus={false} />
      </div>
      <HeadlineStats character={c} className="w-full sm:w-60 sm:flex-none" />
    </div>
  )
}
