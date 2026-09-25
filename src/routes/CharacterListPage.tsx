import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_EXHAUSTION_MAX } from '../features/character-sheet/vitals'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import {
  abilityModifier,
  classSummary,
  evasionValue,
  formatModifier,
  initiativeBonus,
  nimbleAttributeValue,
  nimbleSkillBonus,
  nimbleSkillValue,
  skillBonus,
  skillProficiencyLevel,
  movementSquares,
  totalCharacterLevel,
} from '../vault/deriveStats'
import { ABILITIES, NIMBLE_ATTRIBUTES, SKILLS, type CharacterFrontmatter, type SkillKey } from '../vault/types'

/** How many of a character's best skills the card lists. */
const TOP_SKILL_COUNT = 3

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** Mirrors HitPoints.tsx's hpFillClass: healthy → bloodied → critical. */
function hpFillClass(pct: number): string {
  if (pct > 50) return 'from-success/60 to-success'
  if (pct > 25) return 'from-warning/60 to-warning'
  return 'from-danger/60 to-danger'
}

function percent(current: number, max: number): number {
  return max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
}

/** The trained skills worth showing off: Nimble skills by trained value, D&D skills by proficiency
 * (expertise first), each with its total roll bonus. */
function topSkills(character: CharacterFrontmatter): { key: SkillKey; bonus: number }[] {
  const nimble = Boolean(character.nimble_attributes)
  const ranked = SKILLS.map(({ key }) => ({
    key,
    rank: nimble ? nimbleSkillValue(character, key) : { none: 0, proficient: 1, expertise: 2 }[skillProficiencyLevel(character, key)],
    bonus: nimble ? nimbleSkillBonus(character, key) : skillBonus(character, key),
  }))
  return ranked
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
        <div className={`h-full rounded-full transition-[width] ${fillClass}`} style={{ width: `${percent(current, max)}%` }} />
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

function CharacterCard({ frontmatter: c }: { frontmatter: CharacterFrontmatter }) {
  const t = useT()
  const temp = c.hp.temp ?? 0
  const resilience = typeof c.resilience?.current === 'number' && typeof c.resilience.max === 'number' ? c.resilience : undefined
  const exhaustion = c.conditions?.exhaustion ?? 0
  const exhaustionMax = c.conditions?.exhaustion_max ?? DEFAULT_EXHAUSTION_MAX
  const dead = exhaustion >= exhaustionMax
  const down = !dead && c.hp.current <= 0
  const evasion = evasionValue(c)
  const squares = movementSquares(c)
  const skills = topSkills(c)
  const slots = Object.entries(c.spellcasting?.slots ?? {})
  const origin = [c.species, c.background, c.alignment].filter(Boolean).join(' · ')

  return (
    <div
      className={`rpg-panel group relative flex h-full flex-col gap-3 p-4 transition duration-200 hover:-translate-y-1 hover:shadow-[0_0_24px_-6px_var(--color-trim)]`}
    >
      {/* Identity */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {c.portrait_url ? (
            <img
              src={c.portrait_url}
              alt=""
              className={`size-16 rounded-md border-2 border-trim object-cover shadow-[0_0_0_2px_var(--color-surface),0_0_16px_-4px_color-mix(in_srgb,var(--color-trim)_60%,transparent)] transition ${
                down || dead ? 'grayscale' : ''
              }`}
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

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate font-display text-lg font-bold tracking-wide text-fg">{c.name}</div>
            {(down || dead) && (
              <span className="shrink-0 rounded-full border border-danger/60 bg-danger/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-danger">
                {dead ? `☠ ${t('characterList.dead')}` : t('characterList.fallen')}
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

      {/* Life force: same colours and ward as the sheet */}
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
          fillClass={`bg-linear-to-r ${hpFillClass(percent(c.hp.current, c.hp.max))}`}
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

      {/* Headline stats */}
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
          {formatModifier(initiativeBonus(c))}
        </StatTile>
        {squares !== undefined ? (
          <StatTile label={t('short.movement')} title={t('stats.movementHint', { count: squares, speed: c.speed })}>
            {squares}
          </StatTile>
        ) : (
          <StatTile label={t('short.speed')} title={t('stats.speed')}>
            <span className="text-xs">{c.speed}</span>
          </StatTile>
        )}
      </div>

      {/* Attributes */}
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

      {/* Best skills and spell slots, only when there are any */}
      {(skills.length > 0 || slots.length > 0) && (
        <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-trim/15 pt-2.5">
          {skills.map(({ key, bonus }) => (
            <span
              key={key}
              title={t('characterList.topSkills')}
              className="rounded-full border border-trim/30 bg-trim/[0.07] px-2 py-0.5 text-[0.68rem] text-fg"
            >
              {t(`skill.${key}`)} <span className="font-num font-bold text-trim">{formatModifier(bonus)}</span>
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
      )}
    </div>
  )
}

export function CharacterListPage() {
  const t = useT()
  const characters = useVaultStore((s) => s.vault.characters)

  if (characters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-fg-muted">
        {t('characterList.emptyBefore')} <code className="rounded bg-surface-2 px-1 py-0.5">type: character</code>{' '}
        {t('characterList.emptyAfter')}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-fg">{t('characterList.title')}</h1>
        <span className="text-sm text-fg-muted">{characters.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {characters.map((c) => (
          <Link key={c.path} to={`/characters/${encodeURIComponent(c.frontmatter.name)}`} className="block">
            <CharacterCard frontmatter={c.frontmatter} />
          </Link>
        ))}
      </div>
    </div>
  )
}
