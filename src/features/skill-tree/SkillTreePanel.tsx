import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Card } from '../../components/Card'
import { renderObsidianBody } from '../../components/obsidian/renderObsidian'
import { useI18n, type TranslationKey } from '../../i18n/useI18n'
import { useVaultStore } from '../../store/vaultStore'
import { resolveClassProgressions, type ClassProgression, type ProgressionNode } from '../../vault/adapters/classProgression'
import type { CharacterFrontmatter, FeatureUsage } from '../../vault/types'
import { layoutBoard, nodeState, roman, searchNodes, type BoardCell, type BoardLayout, type NodeState, type TileTier } from './boardLayout'
import { SkillIcon } from './SkillIcon'
import { iconFor } from './skillIconKeys'

const USAGE_LABEL: Record<FeatureUsage, TranslationKey> = {
  action: 'skills.usage.action',
  reaction: 'skills.usage.reaction',
  passive: 'skills.usage.passive',
}

/** Board geometry, in px: level gutter, lane width, row height, header, values column. */
const GUTTER = 60
/** Narrowest and widest a lane may get while the board stretches to the available width. */
const LANE_MIN = 58
const LANE_MAX = 150
const ROW = 86
const HEADER = 34
/** The values column, roomy and tight. */
const VALUES = 118
const VALUES_TIGHT = 84
const TILE: Record<TileTier, number> = { keystone: 54, major: 46, minor: 36 }
/** Below this lane width the tiles shrink and names get a third line. */
const TIGHT_LANE = 86
const TILE_TIGHT: Record<TileTier, number> = { keystone: 46, major: 40, minor: 32 }
/** Tile centre below the row's top. */
const TILE_Y = 30

type T = ReturnType<typeof useI18n>['t']

function statusText(t: T, node: ProgressionNode, level: number): string {
  const state = nodeState(node, level)
  if (state === 'unlocked') return t('skills.unlocked')
  if (state === 'next') return t('skills.nextLevel')
  return t('skills.lockedIn', { level: node.level, n: node.level - level })
}

/** Markdown/wikilink markup stripped, for the tooltip's plain preview. */
function plain(text: string): string {
  return text
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/[*_`]/g, '')
}

/** A feature's tile: its icon in a framed socket, lit, pulsing or dim by level. */
function Tile({ node, tier, state, size, className = '' }: { node: ProgressionNode; tier: TileTier; state: NodeState; size: number; className?: string }) {
  return (
    <span
      className={`st-tile st-tile-${tier} st-${state} ${node.source === 'subclass' ? 'st-sub' : ''} ${node.kind === 'subclass-placeholder' ? 'st-placeholder' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <SkillIcon name={iconFor(node)} className={tier === 'minor' ? 'size-4' : tier === 'keystone' ? 'size-7' : 'size-6'} />
      {node.rank > 1 && node.source === 'class' && <span className="st-rank-badge">{roman(node.rank)}</span>}
    </span>
  )
}

interface Placed extends BoardCell {
  x: number
  y: number
  size: number
}

/**
 * The talent board: one row per level, the character's level marked by a glowing rule — above it
 * everything is earned, the row below it is next, the rest waits dimmed. Ranks of one feature line up
 * in their own lane and are joined; the subclass has the last lane, in violet; the table's values
 * stand at the right on the levels they change.
 */
function BoardView({
  progression,
  board,
  matches,
  selectedId,
  onSelect,
}: {
  progression: ClassProgression
  board: BoardLayout
  matches: Set<string> | null
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { t } = useI18n()
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [available, setAvailable] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { level, maxLevel } = progression

  // The lanes widen to fill the board's width (and scroll once they reach their minimum).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Lane x offsets; the subclass lane widens for picks that come side by side.
  const laneUnits = board.lanes.map((_, i) => Math.min(3, Math.max(1, ...board.cells.filter((c) => c.lane === i).map((c) => c.slots))))
  const hasValues = board.changes.size > 0
  const units = laneUnits.reduce((a, b) => a + b, 0)
  // The board fits its width: lanes shrink (tiles too, names wrap to a third line) before it would scroll.
  const fit = (valuesWidth: number) => Math.floor((available - GUTTER - (hasValues ? valuesWidth : 12)) / Math.max(1, units))
  const tight = fit(VALUES) < TIGHT_LANE
  const valuesWidth = tight ? VALUES_TIGHT : VALUES
  const unit = Math.max(LANE_MIN, Math.min(LANE_MAX, fit(valuesWidth)))
  const tiles = tight ? TILE_TIGHT : TILE
  const laneWidths = laneUnits.map((u) => u * unit)
  const laneX = laneWidths.map((_, i) => GUTTER + laneWidths.slice(0, i).reduce((a, b) => a + b, 0))
  const lanesEnd = GUTTER + laneWidths.reduce((a, b) => a + b, 0)
  const width = lanesEnd + (hasValues ? valuesWidth : 12)
  const height = HEADER + maxLevel * ROW
  const rowTop = (l: number) => HEADER + (l - 1) * ROW

  const placed: Placed[] = board.cells.map((cell) => ({
    ...cell,
    x: laneX[cell.lane] + (laneWidths[cell.lane] * (cell.slot + 0.5)) / cell.slots,
    y: rowTop(cell.node.level) + TILE_Y,
    size: tiles[cell.tier],
  }))
  const byId = new Map(placed.map((p) => [p.node.id, p]))
  const hovered = hoverId ? byId.get(hoverId) : undefined
  const selectedFamily = selectedId ? byId.get(selectedId)?.node.family : undefined
  const subclassLane = board.lanes.findIndex((l) => l.kind === 'subclass')

  return (
    <div ref={scrollRef} className="st-board-scroll">
      <div className={`st-board ${tight ? 'st-tight' : ''}`} style={{ width, height }} onClick={() => onSelect(null)}>
        {/* Rows: alternating bands, the earned ones warm, the next one highlighted. */}
        {Array.from({ length: maxLevel }, (_, i) => i + 1).map((l) => {
          const state: NodeState = l <= level ? 'unlocked' : l === level + 1 ? 'next' : 'locked'
          return (
            <div key={l} className={`st-row st-row-${state} ${l % 2 === 0 ? 'st-row-even' : ''}`} style={{ top: rowTop(l), height: ROW, width }}>
              <span className={`st-level st-level-${state}`} style={{ left: GUTTER / 2 - 15 }}>
                {l}
              </span>
            </div>
          )
        })}

        {subclassLane >= 0 && <div className="st-sub-lane" style={{ left: laneX[subclassLane] + 4, width: laneWidths[subclassLane] - 8, top: 0, height }} />}

        {/* Headings: the class over its lanes, the subclass over its own. */}
        <span className="st-lane-head" style={{ left: GUTTER, width: (subclassLane >= 0 ? laneX[subclassLane] : lanesEnd) - GUTTER }}>
          {progression.className}
        </span>
        {subclassLane >= 0 && (
          <span
            className="st-lane-head st-lane-head-sub"
            style={{ left: laneX[subclassLane] + 4, width: laneWidths[subclassLane] - 8 }}
            title={progression.subclass?.name ?? progression.subclassLabel}
          >
            {progression.subclass?.name ?? progression.subclassLabel ?? t('skills.subclass')}
          </span>
        )}
        {hasValues && (
          <span className="st-lane-head" style={{ left: lanesEnd + 6, width: valuesWidth - 12 }}>
            {t('skills.values')}
          </span>
        )}

        {/* "You are here": a glowing rule under the character's row. */}
        {level >= 1 && level <= maxLevel && (
          <div className="st-here" style={{ top: rowTop(level) + ROW - 1, width }}>
            <span className="st-here-label">◆ {t('skills.youAreHere')}</span>
          </div>
        )}

        <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
          {board.links.map(([fromId, toId]) => {
            const from = byId.get(fromId)
            const to = byId.get(toId)
            if (!from || !to) return null
            const state = nodeState(to.node, level)
            const active = selectedFamily !== undefined && to.node.family === selectedFamily
            const dim = matches !== null && !(matches.has(fromId) || matches.has(toId))
            return (
              <line
                key={`${fromId}-${toId}`}
                x1={from.x}
                y1={from.y + from.size / 2 + 3}
                x2={to.x}
                y2={to.y - to.size / 2 - 3}
                className={`st-link st-link-${state} ${active ? 'st-link-active' : ''} ${dim ? 'st-dim' : ''}`}
              />
            )
          })}
        </svg>

        {placed.map((p) => {
          const { node } = p
          const state = nodeState(node, level)
          const dim = matches !== null && !matches.has(node.id)
          return (
            <button
              key={node.id}
              type="button"
              className={`st-cell ${selectedId === node.id ? 'st-selected' : ''} ${dim ? 'st-dim' : ''} ${matches?.has(node.id) ? 'st-match' : ''}`}
              style={{ left: p.x - laneWidths[p.lane] / p.slots / 2, top: p.y - p.size / 2, width: laneWidths[p.lane] / p.slots }}
              aria-label={`${node.name}, ${t('skills.level', { n: node.level })}, ${statusText(t, node, level)}`}
              aria-pressed={selectedId === node.id}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(selectedId === node.id ? null : node.id)
              }}
              onPointerEnter={() => setHoverId(node.id)}
              onPointerLeave={() => setHoverId((h) => (h === node.id ? null : h))}
              onFocus={() => setHoverId(node.id)}
              onBlur={() => setHoverId((h) => (h === node.id ? null : h))}
            >
              <Tile node={node} tier={p.tier} state={state} size={p.size} />
              <span className={`st-cell-name st-cell-name-${state}`} title={node.name}>
                {node.name}
              </span>
            </button>
          )
        })}

        {[...board.changes].map(([l, values]) => (
          <div key={l} className="st-values" style={{ left: lanesEnd + 6, top: rowTop(l) + 10, width: valuesWidth - 12 }}>
            {values.map((v) => (
              <p key={v.label} className={`min-w-0 ${l <= level ? 'text-fg' : 'text-fg-muted'}`}>
                <span className="line-clamp-2 text-[0.62rem] tracking-[0.08em] text-fg-muted uppercase [overflow-wrap:anywhere] [hyphens:auto]" title={v.label}>
                  {v.label}
                </span>
                <span className="font-numeric text-sm font-bold">{v.value}</span>
              </p>
            ))}
          </div>
        ))}

        {hovered && <NodeTooltip node={hovered.node} level={level} x={hovered.x} y={hovered.y - hovered.size / 2} boardWidth={width} />}
      </div>
    </div>
  )
}

function NodeTooltip({ node, level, x, y, boardWidth }: { node: ProgressionNode; level: number; x: number; y: number; boardWidth: number }) {
  const { t } = useI18n()
  const align = x < 150 ? 'left' : x > boardWidth - 150 ? 'right' : 'center'
  const below = y < 120
  return (
    <div role="tooltip" className={`st-tooltip st-tooltip-${align} ${below ? 'st-tooltip-below' : ''}`} style={{ left: x, top: below ? y + 62 : y }}>
      <p className="font-display text-sm font-bold tracking-wide text-fg">{node.name}</p>
      <p className="mt-0.5 text-[0.68rem] tracking-[0.1em] text-fg-muted uppercase">
        {t('skills.level', { n: node.level })}
        {node.usage && node.kind === 'feature' && ` · ${t(USAGE_LABEL[node.usage])}`}
        {' · '}
        <span className={`st-status-${nodeState(node, level)}`}>{statusText(t, node, level)}</span>
      </p>
      {node.description && <p className="mt-1.5 line-clamp-4 text-xs leading-relaxed text-fg/85">{plain(node.description)}</p>}
    </div>
  )
}

function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`rounded-full border border-trim/25 px-2 py-0.5 text-[0.68rem] tracking-wide ${className}`}>{children}</span>
}

/** Everything about one node: what it does, when it comes, its other ranks and choices. */
function NodeDetail({ progression, node, tier, onSelect }: { progression: ClassProgression; node: ProgressionNode; tier: TileTier; onSelect: (id: string | null) => void }) {
  const { t } = useI18n()
  const state = nodeState(node, progression.level)
  const family = progression.nodes.filter((n) => n.family === node.family)
  const subclassName = progression.subclass?.name
  const description =
    node.kind === 'subclass-placeholder'
      ? subclassName && !progression.subclass?.found
        ? t('skills.subclassMissing', { name: subclassName })
        : t('skills.subclassFeature', { label: progression.subclassLabel ?? t('skills.subclass') })
      : node.description

  return (
    <Card
      title={node.source === 'subclass' ? (subclassName ?? progression.subclassLabel ?? t('skills.subclass')) : progression.className}
      aside={
        <button type="button" onClick={() => onSelect(null)} className="st-close" aria-label={t('skills.close')}>
          ✕
        </button>
      }
    >
      <div className="flex items-start gap-3">
        <Tile node={node} tier={tier === 'minor' ? 'major' : tier} state={state} size={52} />
        <div className="min-w-0">
          <h3 className="font-display text-base leading-tight font-bold tracking-wide text-fg">{node.name}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip className="font-numeric">{t('skills.level', { n: node.level })}</Chip>
            {node.usage && node.kind === 'feature' && <Chip>{t(USAGE_LABEL[node.usage])}</Chip>}
          </div>
        </div>
      </div>
      <p className={`mt-3 text-sm font-semibold st-status-${state}`}>{statusText(t, node, progression.level)}</p>
      {node.kind === 'subclass-choice' && (
        <p className="mt-1 text-sm text-fg">{subclassName ? t('skills.subclassChosen', { name: subclassName }) : t('skills.subclassOpen')}</p>
      )}
      {description && <div className="mt-2 text-sm leading-relaxed text-fg/90 [overflow-wrap:anywhere]">{renderObsidianBody(description)}</div>}

      {family.length > 1 && (
        <div className="mt-4">
          <h4 className="st-subhead">{node.source === 'subclass' ? (subclassName ?? t('skills.subclass')) : t('skills.ranks')}</h4>
          <ol className="mt-1.5 flex flex-wrap gap-1.5">
            {family.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onSelect(n.id)}
                  aria-current={n.id === node.id}
                  className={`st-rank st-${nodeState(n, progression.level)} ${n.id === node.id ? 'st-rank-current' : ''}`}
                  title={n.name}
                >
                  {node.source === 'subclass' ? `${n.level} · ${n.name}` : `${roman(n.rank)} · ${n.level}`}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {node.options && (
        <div className="mt-4">
          <h4 className="st-subhead">{t('skills.options')}</h4>
          <ul className="mt-1.5 space-y-1.5 text-sm">
            {node.options.map((o) => (
              <li key={o.name} className="flex gap-2">
                <span aria-hidden className="mt-[0.55em] size-1 shrink-0 rotate-45 bg-trim/70" />
                <span>
                  <span className="font-semibold text-fg">{o.name}</span>
                  {o.text && <span className="text-fg/80"> — {renderObsidianBody(o.text)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {node.note && (
        <div className="mt-4 border-t border-trim/15 pt-2 text-xs text-fg-muted">
          {t('skills.openNote')}: {renderObsidianBody(`[[${node.note}]]`)}
        </div>
      )}
    </Card>
  )
}

/** Bottom edge of the app's sticky header — where floating panels may start. */
function headerBottom(): number {
  return document.querySelector('header.sticky')?.getBoundingClientRect().bottom ?? 0
}

/**
 * The selected feature's details, floating beside the board: rendered into `body` so nothing on the
 * page (the breadcrumb bar, a panel's stacking context) can paint over it, and placed below the
 * sticky app header so its close button always shows. Phones get it as a sheet at the bottom.
 */
function DetailSheet({ children }: { children: ReactNode }) {
  const [top, setTop] = useState(headerBottom)
  useEffect(() => {
    const update = () => setTop(headerBottom())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return createPortal(
    <aside className="st-sheet" style={{ '--st-sheet-top': `${Math.round(top) + 12}px` } as CSSProperties}>
      {children}
    </aside>,
    document.body,
  )
}

/** The values of the highest level at or below `level` that lists any (a subclass table only names some levels). */
function latestValues(progression: ClassProgression, level: number) {
  for (let l = level; l >= 1; l--) {
    const values = progression.values.get(l)
    if (values) return values
  }
  return undefined
}

/** Above the board: how far along the class is, what the next level brings, the table's values now. */
function Overview({ progression, onSelect }: { progression: ClassProgression; onSelect: (id: string) => void }) {
  const { t } = useI18n()
  const { level, nodes, maxLevel } = progression
  const unlocked = nodes.filter((n) => n.level <= level).length
  const nextLevel = nodes.find((n) => n.level > level)?.level
  const upcoming = nextLevel !== undefined ? nodes.filter((n) => n.level === nextLevel) : []
  const valuesNow = progression.values.get(level) ?? latestValues(progression, level)
  const valuesNext = nextLevel !== undefined ? progression.values.get(nextLevel) : undefined

  return (
    <section className="rpg-panel grid grid-cols-1 gap-x-8 gap-y-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
      <div>
        <h4 className="st-subhead">{t('skills.progress')}</h4>
        <p className="mt-1 font-display text-lg font-bold tracking-wide text-fg">{t('skills.levelOf', { level, max: maxLevel })}</p>
        <div className="st-progress mt-2" role="progressbar" aria-valuemin={0} aria-valuemax={maxLevel} aria-valuenow={level}>
          <span style={{ width: `${Math.min(100, (level / maxLevel) * 100)}%` }} />
        </div>
        {nodes.length > 0 && <p className="mt-1.5 text-xs text-fg-muted">{t('skills.unlockedCount', { n: unlocked, total: nodes.length })}</p>}
      </div>

      {upcoming.length > 0 ? (
        <div>
          <h4 className="st-subhead">{t('skills.upNext', { n: nextLevel! })}</h4>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {upcoming.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => onSelect(n.id)} className="st-upcoming">
                  <Tile node={n} tier="minor" state="next" size={28} />
                  {n.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        nodes.length > 0 && <p className="self-center text-sm text-success">{t('skills.maxed')}</p>
      )}

      {valuesNow && valuesNow.length > 0 && (
        <div>
          <h4 className="st-subhead">{t('skills.valuesAt', { n: level })}</h4>
          <dl className="mt-1.5 divide-y divide-trim/10 text-sm">
            {valuesNow.map((v) => {
              const next = valuesNext?.find((n) => n.label === v.label)?.value
              return (
                <div key={v.label} className="flex items-baseline justify-between gap-3 py-1">
                  <dt className="text-fg-muted">{v.label}</dt>
                  <dd className="font-numeric text-fg">
                    {v.value}
                    {next && next !== v.value && <span className="ml-1.5 text-trim">→ {next}</span>}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}
    </section>
  )
}

/** The same progression as rows per level with small tiles — for phones. */
function ListView({ progression, matches, selectedId, onSelect }: { progression: ClassProgression; matches: Set<string> | null; selectedId: string | null; onSelect: (id: string) => void }) {
  const { t } = useI18n()
  const levels = Array.from({ length: progression.maxLevel }, (_, i) => i + 1).filter((l) => progression.nodes.some((n) => n.level === l))
  return (
    <ol className="st-list">
      {levels.map((l) => {
        const state: NodeState = l <= progression.level ? 'unlocked' : l === progression.level + 1 ? 'next' : 'locked'
        return (
          <li key={l} className={`st-list-row st-${state} ${l === progression.level ? 'st-list-current' : ''}`}>
            <span className={`st-level st-level-${state} shrink-0`}>{l}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5">
                {progression.nodes
                  .filter((n) => n.level === l)
                  .map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => onSelect(n.id)}
                      aria-pressed={selectedId === n.id}
                      className={`st-list-chip ${n.source === 'subclass' ? 'st-sub' : ''} ${selectedId === n.id ? 'st-selected' : ''} ${matches !== null && !matches.has(n.id) ? 'st-dim' : ''}`}
                    >
                      <Tile node={n} tier="minor" state={state} size={24} />
                      {n.name}
                    </button>
                  ))}
              </div>
              {l === progression.level && <p className="mt-1.5 text-[0.7rem] tracking-[0.12em] text-trim uppercase">◆ {t('skills.youAreHere')}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function EmptyState({ progression }: { progression: ClassProgression }) {
  const { t } = useI18n()
  return (
    <div className="st-empty">
      <p className="font-display text-base font-bold tracking-wide text-fg">
        {progression.noteFound ? t('skills.empty', { name: progression.className }) : t('skills.noClassNote', { name: progression.className })}
      </p>
      <p className="max-w-prose text-sm text-fg-muted">{t('skills.emptyHint')}</p>
      <pre className="st-example">{`## Klassentabelle

| Stufe | Merkmale                          |
|:-----:| --------------------------------- |
|   1   | [[Beute markieren]], [[Sammler]]  |
|   2   | [[Rausch der Jagd]]               |
|   3   | [[Subklasse]]                     |`}</pre>
    </div>
  )
}

/**
 * The Skill tree tab: each class's progression from level 1 to 20 (see `adapters/classProgression.ts`)
 * as a talent board or a list, with what's unlocked, what the next level brings and what comes later.
 */
export function SkillTreePanel({ character }: { character: CharacterFrontmatter }) {
  const { t } = useI18n()
  const rawFiles = useVaultStore((s) => s.rawFiles)
  const progressions = useMemo(() => resolveClassProgressions(character, rawFiles), [character, rawFiles])
  const [classIndex, setClassIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'tree' | 'list'>(() => (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 40rem)').matches ? 'list' : 'tree'))
  const progression = progressions[Math.min(classIndex, progressions.length - 1)]
  const board = useMemo(() => (progression ? layoutBoard(progression) : null), [progression])
  const matches = useMemo(() => (progression ? searchNodes(progression.nodes, query) : null), [progression, query])
  const selected = progression?.nodes.find((n) => n.id === selectedId)
  const selectedTier = board?.cells.find((c) => c.node.id === selectedId)?.tier ?? 'major'

  if (!progression || !board) return null

  return (
    <div className="space-y-3">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {progressions.length > 1 && (
            <div className="flex flex-wrap gap-1" role="tablist">
              {progressions.map((p, i) => (
                <button
                  key={p.className}
                  type="button"
                  role="tab"
                  aria-selected={i === classIndex}
                  onClick={() => {
                    setClassIndex(i)
                    setSelectedId(null)
                  }}
                  className={`st-toggle ${i === classIndex ? 'st-toggle-on' : ''}`}
                >
                  {p.className} {p.level}
                </button>
              ))}
            </div>
          )}
          {progression.nodes.length > 0 && (
            <>
              <div className="flex rounded-full border border-trim/25 p-0.5">
                {(['tree', 'list'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`st-toggle border-0 ${view === v ? 'st-toggle-on' : ''}`}>
                    {t(v === 'tree' ? 'skills.viewTree' : 'skills.viewList')}
                  </button>
                ))}
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('skills.search')}
                aria-label={t('skills.search')}
                className="journal-input ml-auto w-full py-1.5 text-sm sm:w-56"
              />
            </>
          )}
        </div>

        {progression.nodes.length > 0 && <Overview progression={progression} onSelect={setSelectedId} />}
        {!progression.fromTable && progression.nodes.length > 0 && <p className="rounded-lg border border-dashed border-trim/30 px-3 py-2 text-xs text-fg-muted">{t('skills.fromFeatures')}</p>}
        {matches !== null && matches.size === 0 && <p className="text-sm text-fg-muted">{t('skills.noMatch')}</p>}

        {progression.nodes.length === 0 ? (
          <EmptyState progression={progression} />
        ) : view === 'tree' ? (
          <BoardView progression={progression} board={board} matches={matches} selectedId={selectedId} onSelect={setSelectedId} />
        ) : (
          <ListView progression={progression} matches={matches} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </div>

      {selected && (
        <DetailSheet>
          <NodeDetail progression={progression} node={selected} tier={selectedTier} onSelect={setSelectedId} />
        </DetailSheet>
      )}
    </div>
  )
}
