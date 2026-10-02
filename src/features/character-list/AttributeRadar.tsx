import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useT, type TranslateFn } from '../../i18n/useI18n'
import { abilityModifier, classSummary, formatModifier, nimbleAttributeValue, totalCharacterLevel } from '../../vault/deriveStats'
import { ABILITIES, NIMBLE_ATTRIBUTES, type CharacterFrontmatter, type VaultFile } from '../../vault/types'
import { characterFate } from '../character-sheet/vitals'
import { initials } from './CharacterCard'
import { CharacterComparison } from './CharacterComparison'

interface Axis {
  key: string
  short: string
  label: string
}

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

/** One scale for every chart of a system, so shapes compare across the party: at least −2…+4,
 * widened to whatever the party actually reaches. */
export function radarDomain(values: number[]): [number, number] {
  return [Math.min(-2, ...values), Math.max(4, ...values)]
}

/** From this party size the overlay stops drawing one outline per character (that turns into a
 * tangle) and shows the party's best and average values instead. */
export const AGGREGATE_FROM = 6

/** Per attribute: the best value anyone in the party has, and the party average. */
export function partyAggregate(values: number[][]): { max: number[]; mean: number[] } {
  const axes = values[0]?.length ?? 0
  const column = (i: number) => values.map((v) => v[i])
  return {
    max: Array.from({ length: axes }, (_, i) => Math.max(...column(i))),
    mean: Array.from({ length: axes }, (_, i) => column(i).reduce((sum, v) => sum + v, 0) / values.length),
  }
}

/** How a series is drawn: the focused character (accent), everyone else (muted), or the party's
 * best (envelope) and average values. */
type Emphasis = 'accent' | 'muted' | 'envelope' | 'average'

const PAINT_ORDER: Record<Emphasis, number> = { muted: 0, envelope: 1, average: 2, accent: 3 }

interface Series {
  id: string
  values: number[]
  emphasis: Emphasis
}

const VIEW = 240
const CENTRE = VIEW / 2
const OUTER = 84
/** Values start at this ring, leaving the middle free for the portrait (a donut radar). */
const INNER = 26

function point(axisIndex: number, axisCount: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (axisIndex * 2 * Math.PI) / axisCount
  return [CENTRE + radius * Math.cos(angle), CENTRE + radius * Math.sin(angle)]
}

/**
 * A radar of one attribute set. Rings mark every step of the scale (the 0 ring a little stronger),
 * axes are labelled outside. Hovering anywhere in an axis' wedge reports that axis, so a parent can
 * mirror it in the party radar; the active axis shows each accent series' value.
 */
function RadarChart({
  axes,
  series,
  domain,
  activeAxis,
  onAxis,
  primary = [],
  centre,
  label,
}: {
  axes: Axis[]
  series: Series[]
  domain: [number, number]
  activeAxis: number | null
  onAxis: (axis: number | null) => void
  primary?: string[]
  centre?: ReactNode
  label: string
}) {
  const [lo, hi] = domain
  const n = axes.length
  const radius = (value: number) => INNER + ((Math.min(hi, Math.max(lo, value)) - lo) / (hi - lo)) * (OUTER - INNER)
  const step = hi - lo > 8 ? 2 : 1
  const rings: number[] = []
  for (let v = lo; v <= hi; v += step) rings.push(v)
  const ringPath = (r: number) => axes.map((_, i) => point(i, n, r).join(',')).join(' ')
  const ordered = [...series].sort((a, b) => PAINT_ORDER[a.emphasis] - PAINT_ORDER[b.emphasis])
  // Values on the active axis: the accent series', else the party best when that's what's shown.
  const labelled = ordered.filter((s) => s.emphasis === 'accent')
  if (labelled.length === 0) labelled.push(...ordered.filter((s) => s.emphasis === 'envelope'))

  return (
    <div className="relative mx-auto aspect-square w-full max-w-64">
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="radar size-full overflow-visible" role="img" aria-label={label} onMouseLeave={() => onAxis(null)}>
        {rings.map((v) => (
          <polygon key={v} points={ringPath(radius(v))} className={v === 0 ? 'radar-ring is-zero' : 'radar-ring'} />
        ))}
        {axes.map((axis, i) => {
          const [x, y] = point(i, n, OUTER)
          return <line key={axis.key} x1={CENTRE} y1={CENTRE} x2={x} y2={y} className={`radar-spoke ${activeAxis === i ? 'is-active' : ''}`} />
        })}

        {ordered.map((s) => {
          const points = s.values.map((v, i) => point(i, n, radius(v)).join(',')).join(' ')
          return (
            <g key={s.id} className={`radar-series is-${s.emphasis}`}>
              <polygon points={points} />
              {s.emphasis === 'accent' &&
                s.values.map((v, i) => {
                  const [x, y] = point(i, n, radius(v))
                  return <circle key={i} cx={x} cy={y} r={activeAxis === i ? 5.5 : 4} />
                })}
            </g>
          )
        })}

        {/* Value of the active axis, beside each accent vertex — text in text ink, never the series colour. */}
        {activeAxis !== null &&
          labelled.map((s) => {
              // Outside the vertex, unless that would run into the axis label — then just inside it.
              const r = radius(s.values[activeAxis])
              const [x, y] = point(activeAxis, n, r + 13 > OUTER - 2 ? r - 14 : r + 13)
              return (
                <text key={s.id} x={x} y={y} className="radar-value" textAnchor="middle" dominantBaseline="middle">
                  {formatModifier(s.values[activeAxis])}
                </text>
              )
            })}

        {axes.map((axis, i) => {
          const [x, y] = point(i, n, OUTER + 16)
          return (
            <text
              key={axis.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`radar-label ${activeAxis === i ? 'is-active' : ''} ${primary.includes(axis.key) ? 'is-primary' : ''}`}
            >
              {axis.short}
            </text>
          )
        })}

        {/* Hit wedges, larger than the marks: one per axis, reaching past the labels. */}
        {axes.map((axis, i) => {
          const half = Math.PI / n
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
          const reach = OUTER + 30
          const a = [CENTRE + reach * Math.cos(angle - half), CENTRE + reach * Math.sin(angle - half)]
          const b = [CENTRE + reach * Math.cos(angle + half), CENTRE + reach * Math.sin(angle + half)]
          return (
            <path
              key={axis.key}
              d={`M${CENTRE},${CENTRE} L${a.join(',')} A${reach},${reach} 0 0 1 ${b.join(',')} Z`}
              fill="transparent"
              // A title attribute (not a <title> child) so the app's themed TooltipLayer shows it;
              // React's SVG types lack `title`, hence the spread.
              {...{ title: axis.label }}
              onMouseEnter={() => onAxis(i)}
              onClick={(event) => {
                // An axis tap must not also (de)select the character card around the chart.
                event.stopPropagation()
                onAxis(activeAxis === i ? null : i)
              }}
            />
          )
        })}
      </svg>
      {centre && <div className="pointer-events-none absolute inset-0 flex items-center justify-center">{centre}</div>}
    </div>
  )
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

function LegendSwatch({ emphasis }: { emphasis: Emphasis }) {
  return (
    <svg aria-hidden viewBox="0 0 22 10" className="h-2.5 w-5.5 shrink-0 overflow-visible">
      <g className={`radar-series is-${emphasis}`}>
        <polygon points="1,9 11,1 21,9" />
      </g>
    </svg>
  )
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
                      to={`/characters/${encodeURIComponent(c.frontmatter.name)}`}
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
