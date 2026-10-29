import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { clamp, headerHeight, PHONE_MAX_WIDTH, useMediaQuery } from '../../utils/viewport'
import { createPortal } from 'react-dom'
import { Card } from '../../components/Card'
import { useDismiss } from '../../components/useDismiss'
import { renderObsidianBody } from '../../components/obsidian/renderObsidian'
import { useI18n, type TranslationKey } from '../../i18n/useI18n'
import { useVaultStore } from '../../store/vaultStore'
import { resolveClassProgressions, type ClassProgression, type ProgressionNode } from '../../vault/adapters/classProgression'
import type { CharacterFrontmatter, FeatureUsage } from '../../vault/types'
import { linksToText } from '../../vault/wikilinkSyntax'
import { boardGeometry, GUTTER, layoutBoard, nodeState, roman, ROW, rowTop, searchNodes, type BoardLayout, type NodeState, type TileTier } from './boardLayout'
import { SkillIcon } from './SkillIcon'
import { iconFor } from './skillIconKeys'

const USAGE_LABEL: Record<FeatureUsage, TranslationKey> = {
  action: 'skills.usage.action',
  reaction: 'skills.usage.reaction',
  passive: 'skills.usage.passive',
}

type T = ReturnType<typeof useI18n>['t']

function statusText(t: T, node: ProgressionNode, level: number): string {
  const state = nodeState(node, level)
  if (state === 'unlocked') return t('skills.unlocked')
  if (state === 'next') return t('skills.nextLevel')
  return t('skills.lockedIn', { level: node.level, n: node.level - level })
}

/** Markdown/wikilink markup stripped, for the tooltip's plain preview. */
const plain = (text: string) => linksToText(text).replace(/[*_`]/g, '')

/** "Aktion" etc. for a feature that says when it's used; nothing for the subclass's own nodes. */
function usageLabel(t: T, node: ProgressionNode): string | undefined {
  return node.usage && node.kind === 'feature' ? t(USAGE_LABEL[node.usage]) : undefined
}

/** The chosen subclass, else what the class calls it, else "Subclass". */
function subclassTitle(t: T, progression: ClassProgression): string {
  return progression.subclass?.name ?? progression.subclassLabel ?? t('skills.subclass')
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

  const geometry = useMemo(() => boardGeometry(board, available, maxLevel), [board, available, maxLevel])
  const { tight, laneX, laneWidths, lanesEnd, valuesWidth, width, height, byId } = geometry
  const hovered = hoverId ? byId.get(hoverId) : undefined
  const selectedFamily = selectedId ? byId.get(selectedId)?.node.family : undefined
  const subclassLane = board.lanes.findIndex((l) => l.kind === 'subclass')

  return (
    <div ref={scrollRef} className="st-board-scroll">
      <div className={`st-board ${tight ? 'st-tight' : ''}`} style={{ width, height }} onClick={() => onSelect(null)}>
        {/* Rows: alternating bands, the earned ones warm, the next one highlighted. */}
        {Array.from({ length: maxLevel }, (_, i) => i + 1).map((l) => {
          const state = nodeState({ level: l }, level)
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
            title={subclassTitle(t, progression)}
          >
            {subclassTitle(t, progression)}
          </span>
        )}
        {valuesWidth > 0 && (
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

        {geometry.cells.map((p) => {
          const { node } = p
          const state = nodeState(node, level)
          const dim = matches !== null && !matches.has(node.id)
          return (
            <button
              key={node.id}
              type="button"
              data-st-node={node.id}
              className={`st-cell ${selectedId === node.id ? 'st-selected' : ''} ${dim ? 'st-dim' : ''} ${matches?.has(node.id) ? 'st-match' : ''}`}
              style={{ left: p.x - p.width / 2, top: p.y - p.size / 2, width: p.width }}
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

        {hovered && hoverId !== selectedId && <NodeTooltip node={hovered.node} level={level} x={hovered.x} y={hovered.y - hovered.size / 2} boardWidth={width} />}
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
        {usageLabel(t, node) && ` · ${usageLabel(t, node)}`}
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
      title={node.source === 'subclass' ? subclassTitle(t, progression) : progression.className}
      aside={
        <button type="button" onClick={() => onSelect(null)} className="rpg-icon-btn" aria-label={t('skills.close')}>
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
            {usageLabel(t, node) && <Chip>{usageLabel(t, node)}</Chip>}
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
          <h4 className="st-subhead">{node.source === 'subclass' ? subclassTitle(t, progression) : t('skills.ranks')}</h4>
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

/** Wide enough to dock the details beside a tile; narrower screens get the bottom sheet (see skill-tree.css). */
const DOCK_QUERY = '(width >= 64rem)'
const DOCK_GAP = 14
const DOCK_MARGIN = 8

type SheetSide = 'right' | 'left' | 'below' | 'above'
type SheetPlacement = { top: number; left: number; side: SheetSide }

/** The element a node's details point at: its tile on the board or in the list, else its "up next" entry. */
function anchorFor(id: string): HTMLElement | null {
  const sel = `[data-st-node="${CSS.escape(id)}"]`
  const button = document.querySelector<HTMLElement>(`.st-board ${sel}, .st-list ${sel}`) ?? document.querySelector<HTMLElement>(sel)
  return button?.querySelector<HTMLElement>('.st-tile') ?? button
}

/**
 * Beside the tile — right of it if there's room, else left, else under or over it — and kept inside
 * the viewport below the header. It never leaves the tile's height, though: scroll the tile away and
 * the details go with it rather than hanging on to the screen's edge.
 */
function placeSheet(tile: DOMRect, sheet: { width: number; height: number }): SheetPlacement {
  const vw = document.documentElement.clientWidth
  const vh = window.innerHeight
  const minTop = headerHeight(72) + DOCK_MARGIN
  const maxTop = vh - DOCK_MARGIN - sheet.height

  const side: SheetSide =
    tile.right + DOCK_GAP + sheet.width <= vw - DOCK_MARGIN
      ? 'right'
      : tile.left - DOCK_GAP - sheet.width >= DOCK_MARGIN
        ? 'left'
        : tile.bottom + DOCK_GAP + sheet.height <= vh - DOCK_MARGIN
          ? 'below'
          : 'above'

  if (side === 'right' || side === 'left') {
    // The heading level with the tile; then on screen; then still overlapping the tile's height.
    const top = clamp(clamp(tile.top - 24, minTop, maxTop), tile.bottom - sheet.height, tile.top)
    return { side, top, left: side === 'right' ? tile.right + DOCK_GAP : tile.left - DOCK_GAP - sheet.width }
  }
  const left = clamp(tile.left + tile.width / 2 - sheet.width / 2, DOCK_MARGIN, vw - DOCK_MARGIN - sheet.width)
  return { side, left, top: side === 'below' ? tile.bottom + DOCK_GAP : Math.max(minTop, tile.top - DOCK_GAP - sheet.height) }
}

/**
 * The selected feature's details, docked beside its tile: rendered into `body` so nothing on the
 * page (the breadcrumb bar, a panel's stacking context) can paint over it, and kept below the sticky
 * app header (`--app-header-h`) so its close button always shows. It follows the tile as the page or
 * the board scrolls; a tile off screen (picked from "up next" or a rank) is scrolled into view first.
 * Phones get it as a sheet at the bottom. Escape or a click elsewhere closes it.
 */
function DetailSheet({ anchorId, onClose, children }: { anchorId: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const docked = useMediaQuery(DOCK_QUERY)
  const [placement, setPlacement] = useState<SheetPlacement | null>(null)

  useEffect(() => {
    if (!docked) return
    const tile = anchorFor(anchorId)
    if (!tile) return
    const rect = tile.getBoundingClientRect()
    if (rect.top < headerHeight(72) || rect.bottom > window.innerHeight) tile.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  }, [anchorId, docked])

  // Measured before paint, so the sheet never shows in its fallback corner first.
  useLayoutEffect(() => {
    const sheet = ref.current
    if (!docked || !sheet) {
      setPlacement(null)
      return
    }
    let frame = 0
    const update = () => {
      const tile = anchorFor(anchorId)
      const next = tile ? placeSheet(tile.getBoundingClientRect(), sheet.getBoundingClientRect()) : null
      setPlacement((prev) => (prev && next && prev.top === next.top && prev.left === next.left && prev.side === next.side ? prev : next))
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    // Capture: the board scrolls sideways in its own container once its lanes are at their minimum.
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    const observer = new ResizeObserver(schedule)
    observer.observe(sheet)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      observer.disconnect()
    }
  }, [anchorId, docked])

  // Another tile only switches the details (its own click handles that), anything else closes them.
  useDismiss(true, onClose, (target) => Boolean(ref.current?.contains(target) || target.closest('[data-st-node]')))

  const style: CSSProperties | undefined = placement ? { top: placement.top, left: placement.left } : undefined
  return createPortal(
    <aside ref={ref} className="st-sheet" data-side={placement?.side} style={style}>
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
  const valuesNow = latestValues(progression, level)
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
                <button type="button" data-st-node={n.id} onClick={() => onSelect(n.id)} className="st-upcoming">
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
        const state = nodeState({ level: l }, progression.level)
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
                      data-st-node={n.id}
                      onClick={() => onSelect(n.id)}
                      aria-pressed={selectedId === n.id}
                      className={`rpg-chip st-list-chip ${n.source === 'subclass' ? 'st-sub' : ''} ${selectedId === n.id ? 'st-selected' : ''} ${matches !== null && !matches.has(n.id) ? 'st-dim' : ''}`}
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
    <div className="rpg-empty justify-items-start text-left">
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
  // Keyed on what the progressions read, not the whole character — an HP change shouldn't re-parse the tables.
  const { class: classes, features } = character
  const progressions = useMemo(() => resolveClassProgressions({ class: classes, features }, rawFiles), [classes, features, rawFiles])
  const [classIndex, setClassIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'tree' | 'list'>(() => (typeof window !== 'undefined' && window.innerWidth < PHONE_MAX_WIDTH ? 'list' : 'tree'))
  // A class removed from the character meanwhile: the last one stays picked.
  const activeIndex = Math.min(classIndex, progressions.length - 1)
  const progression = progressions[activeIndex]
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
                  aria-selected={i === activeIndex}
                  onClick={() => {
                    setClassIndex(i)
                    setSelectedId(null)
                  }}
                  className={`rpg-chip ${i === activeIndex ? 'rpg-chip-on' : ''}`}
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
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`rpg-chip border-0 ${view === v ? 'rpg-chip-on' : ''}`}>
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
                className="rpg-input ml-auto w-full py-1.5 text-sm sm:w-56"
              />
            </>
          )}
        </div>

        {progression.nodes.length > 0 && <Overview progression={progression} onSelect={setSelectedId} />}
        {!progression.fromTable && progression.nodes.length > 0 && <p className="rpg-note">{t('skills.fromFeatures')}</p>}
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
        <DetailSheet anchorId={selected.id} onClose={() => setSelectedId(null)}>
          <NodeDetail progression={progression} node={selected} tier={selectedTier} onSelect={setSelectedId} />
        </DetailSheet>
      )}
    </div>
  )
}
