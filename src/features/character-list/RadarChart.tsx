import type { ReactNode } from 'react'
import { formatModifier } from '../../rules/deriveStats'

/** One spoke of a radar: its key, the short label drawn at its tip and the full name for tooltips. */
export interface Axis {
  key: string
  short: string
  label: string
}

/** How a series is drawn: the focused character (accent), everyone else (muted), or the party's
 * best (envelope) and average values. */
export type Emphasis = 'accent' | 'muted' | 'envelope' | 'average'

const PAINT_ORDER: Record<Emphasis, number> = { muted: 0, envelope: 1, average: 2, accent: 3 }

export interface Series {
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
export function RadarChart({
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

/** A small sample of how a series of this emphasis is drawn, for legends. */
export function LegendSwatch({ emphasis }: { emphasis: Emphasis }) {
  return (
    <svg aria-hidden viewBox="0 0 22 10" className="h-2.5 w-5.5 shrink-0 overflow-visible">
      <g className={`radar-series is-${emphasis}`}>
        <polygon points="1,9 11,1 21,9" />
      </g>
    </svg>
  )
}
