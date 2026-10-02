import { useState } from 'react'
import { Link } from 'react-router-dom'
import { initials } from '../../components/initials'
import { useT, type TranslateFn } from '../../i18n/useI18n'
import { characterRoute } from '../../routes/paths'
import { abilityModifier, classSummary, formatModifier, nimbleAttributeValue, totalCharacterLevel } from '../../vault/deriveStats'
import { ABILITIES, NIMBLE_ATTRIBUTES, type CharacterFrontmatter, type VaultFile } from '../../vault/types'
import { characterFate } from '../character-sheet/vitals'
import { CharacterComparison } from './CharacterComparison'
import { AGGREGATE_FROM, partyAggregate, radarDomain } from './partyStats'
import { LegendSwatch, RadarChart, type Axis, type Emphasis, type Series } from './RadarChart'

type AttributeSystem = 'nimble' | 'dnd'

function systemOf(c: CharacterFrontmatter): AttributeSystem {
  return c.nimble_attributes ? 'nimble' : 'dnd'
}

function axesFor(system: AttributeSystem, t: TranslateFn): Axis[] {
  return system === 'nimble'
    ? NIMBLE_ATTRIBUTES.map(({ key }) => ({ key, short: key.toUpperCase(), label: t(`nimbleAttribute.${key}`) }))
    : ABILITIES.map(({ key }) => {
        const label = t(`ability.${key}`)
        return { key, short: label.slice(0, 3).toUpperCase(), label }
      })
}

function valuesFor(system: AttributeSystem, c: CharacterFrontmatter): number[] {
  return system === 'nimble'
    ? NIMBLE_ATTRIBUTES.map(({ key }) => nimbleAttributeValue(c, key))
    : ABILITIES.map(({ key }) => abilityModifier(c.abilities[key]))
}

function CentrePortrait({ character: c }: { character: CharacterFrontmatter }) {
  return c.portrait_url ? (
    <img src={c.portrait_url} alt="" className="size-11 rounded-full border-2 border-trim object-cover shadow-[0_0_0_3px_var(--color-surface)]" />
  ) : (
    <div aria-hidden className="rpg-medallion !size-11 font-display text-sm font-bold text-trim">
      {initials(c.name)}
    </div>
  )
}

function describe(name: string, axes: Axis[], values: number[]): string {
  return `${name}: ${axes.map((a, i) => `${a.label} ${formatModifier(values[i])}`).join(', ')}`
}

/** Names what each kind of outline in the party radar stands for — never colour alone. */
function PartyLegend({ aggregate, focusedName }: { aggregate: boolean; focusedName?: string }) {
  const t = useT()
  const items: { emphasis: Emphasis; label: string }[] = aggregate
    ? [
        { emphasis: 'envelope', label: t('characterList.radarLegendMax') },
        { emphasis: 'average', label: t('characterList.radarLegendMean') },
      ]
    : [{ emphasis: 'muted', label: t('characterList.radarLegendEveryone') }]
  if (focusedName) items.push({ emphasis: 'accent', label: focusedName })
  return (
    <ul className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[0.68rem] text-fg-muted">
      {items.map((item) => (
        <li key={item.emphasis} className="flex items-center gap-1.5">
          <LegendSwatch emphasis={item.emphasis} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/**
 * The comparison tab: the whole party's attributes as one radar beside one small radar per
 * character, and every value — skills included — as a table below for exact numbers and screen
 * readers. The party radar overlays everyone as muted outlines or, from `AGGREGATE_FROM`
 * characters on, the party's best and average values; the character under the mouse — or picked by
 * a tap, which also works on touch screens — lights up in it. Hovering an attribute shows its value
 * in that chart and in the party radar. The small radars fill as many columns as the width allows.
 */
export function PartyRadar({ characters }: { characters: VaultFile<CharacterFrontmatter>[] }) {
  const t = useT()
  // The attribute under the pointer and the chart it's in: only that chart and the party radar
  // highlight it — the other characters' charts stay still.
  const [active, setActive] = useState<{ chart: string; axis: number } | null>(null)
  const axisIn = (chart: string) => (axis: number | null) => setActive(axis === null ? null : { chart, axis })
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const focused = hovered ?? selected
  const systems = (['nimble', 'dnd'] as const).filter((system) => characters.some((c) => systemOf(c.frontmatter) === system))

  return (
    <div className="space-y-6">
      <p className="text-xs text-fg-muted">{t('characterList.radarHint')}</p>
      {systems.map((system) => {
        const members = characters.filter((c) => systemOf(c.frontmatter) === system)
        const axes = axesFor(system, t)
        const values = new Map(members.map((c) => [c.path, valuesFor(system, c.frontmatter)]))
        const domain = radarDomain([...values.values()].flat())
        const focusedMember = members.find((c) => c.path === focused)
        const aggregate = members.length >= AGGREGATE_FROM
        const { max, mean } = partyAggregate([...values.values()])
        const overlay: Series[] = aggregate
          ? [
              { id: 'max', values: max, emphasis: 'envelope' },
              { id: 'mean', values: mean, emphasis: 'average' },
            ]
          : members.filter((c) => c.path !== focused).map((c) => ({ id: c.path, values: values.get(c.path)!, emphasis: 'muted' }))
        if (focusedMember) overlay.push({ id: focusedMember.path, values: values.get(focusedMember.path)!, emphasis: 'accent' })

        return (
          <div key={system} className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <section className="rpg-panel p-4 lg:sticky lg:top-4">
              <h2 className="text-center font-display text-sm font-bold tracking-wide text-fg">
                {focusedMember ? focusedMember.frontmatter.name : t('characterList.tabParty')}
              </h2>
              <p className="mb-1 text-center text-[0.65rem] uppercase tracking-wider text-fg-muted">
                {focusedMember
                  ? t('stats.classLevel', { classes: classSummary(focusedMember.frontmatter), level: totalCharacterLevel(focusedMember.frontmatter) })
                  : aggregate
                    ? t('characterList.radarPartyAggregateHint')
                    : t('characterList.radarPartyHint')}
              </p>
              <RadarChart
                axes={axes}
                domain={domain}
                activeAxis={active?.axis ?? null}
                onAxis={axisIn('party')}
                label={t('characterList.tabParty')}
                series={overlay}
                centre={focusedMember ? <CentrePortrait character={focusedMember.frontmatter} /> : undefined}
              />
              <PartyLegend aggregate={aggregate} focusedName={focusedMember?.frontmatter.name} />
            </section>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(13.5rem,1fr))]">
              {members.map((c) => {
                const fallen = characterFate(c.frontmatter) !== 'alive'
                const isSelected = selected === c.path
                return (
                  <section
                    key={c.path}
                    aria-pressed={isSelected}
                    className={`rpg-panel cursor-pointer p-3 transition ${isSelected ? 'ring-2 ring-trim/70' : ''} ${
                      focused === c.path ? 'shadow-[0_0_22px_-6px_var(--color-trim)]' : ''
                    } ${fallen ? 'opacity-60 grayscale' : ''}`}
                    // Mouse only: on a touch screen a tap would otherwise count as hover and click at once.
                    onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(c.path)}
                    onPointerLeave={(event) => event.pointerType === 'mouse' && setHovered(null)}
                    onClick={() => setSelected(isSelected ? null : c.path)}
                  >
                    <Link
                      to={characterRoute(c.frontmatter.name)}
                      className="block text-center hover:text-trim"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span className="block truncate font-display text-sm font-bold tracking-wide text-fg">{c.frontmatter.name}</span>
                      <span className="block truncate text-[0.62rem] font-bold uppercase tracking-wider text-trim">{t('stats.classLevel', { classes: classSummary(c.frontmatter), level: totalCharacterLevel(c.frontmatter) })}</span>
                    </Link>
                    <RadarChart
                      axes={axes}
                      domain={domain}
                      activeAxis={active?.chart === c.path ? active.axis : null}
                      onAxis={axisIn(c.path)}
                      primary={system === 'nimble' ? (c.frontmatter.nimble_primary_attributes ?? []) : []}
                      label={describe(c.frontmatter.name, axes, values.get(c.path)!)}
                      series={[{ id: c.path, values: values.get(c.path)!, emphasis: 'accent' }]}
                      centre={<CentrePortrait character={c.frontmatter} />}
                    />
                  </section>
                )
              })}
            </div>
          </div>
        )
      })}

      <details className="group">
        <summary className="cursor-pointer list-none text-sm font-semibold text-fg-muted hover:text-trim">
          <span className="mr-1.5 inline-block transition group-open:rotate-90">▸</span>
          {t('characterList.tableToggle')}
        </summary>
        <div className="mt-3">
          <CharacterComparison characters={characters} />
        </div>
      </details>
    </div>
  )
}
