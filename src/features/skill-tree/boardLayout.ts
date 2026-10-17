import { SUBCLASS_FAMILY, type ClassProgression, type LevelValue, type ProgressionNode } from '../../vault/adapters/classProgression'
import { fold } from '../../utils/fold'

/**
 * Lays a class's progression out as a talent board: one row per level (1 at the top), features as
 * tiles in lanes. The ranks of a feature line up in one lane and are joined top to bottom; features
 * that come once fill the gaps wherever their level is free; the subclass is always the last lane.
 */

export interface Lane {
  kind: 'core' | 'subclass'
  /** Lane widths: the subclass lane widens for picks that come side by side (at most 3). */
  units: number
}

export interface BoardCell {
  node: ProgressionNode
  lane: number
  /** Tiles of one lane on the same level (the subclass's picks) sit side by side: 0, 1, … */
  slot: number
  slots: number
  tier: TileTier
}

export type TileTier = 'keystone' | 'major' | 'minor'

export interface BoardLayout {
  lanes: Lane[]
  cells: BoardCell[]
  /** Pairs of cells (by node id) to join with a line — consecutive ranks of one feature. */
  links: [string, string][]
  /** The table's values on the levels where they change. */
  changes: Map<number, LevelValue[]>
}

/** Ability-score-style picks (`Kernattribut-Steigerung`, `Talent`): small tiles, never joined. */
const MINOR_FAMILY = /steigerung|attribut|ability score|^talente?$|^feats?$|zaubergrad|^mana$|zaubertricks/i
const isMinorFamily = (node: ProgressionNode) => MINOR_FAMILY.test(node.familyName) || MINOR_FAMILY.test(node.family)

export function tierOf(node: ProgressionNode, familySize: number, maxLevel: number): TileTier {
  if (node.source === 'class' && node.kind === 'feature' && familySize === 1 && node.level >= maxLevel) return 'keystone'
  return isMinorFamily(node) ? 'minor' : 'major'
}

/** `map.get(key)`, created as `[]` when missing. */
function listAt<K, V>(map: Map<K, V[]>, key: K): V[] {
  let list = map.get(key)
  if (!list) map.set(key, (list = []))
  return list
}

export function layoutBoard(progression: ClassProgression): BoardLayout {
  const families = new Map<string, ProgressionNode[]>()
  for (const node of progression.nodes) listAt(families, node.family).push(node)

  /** Levels taken in each lane, and the level spans its joined chains run through. */
  const taken: Set<number>[] = []
  const spans: [number, number][][] = []
  const laneOfNode = new Map<string, number>()
  const free = (lane: number, from: number, to: number) => {
    for (const l of taken[lane]) if (l >= from && l <= to) return false
    return spans[lane].every(([a, b]) => to < a || from > b)
  }
  const place = (from: number, to: number, chain: boolean) => {
    let lane = taken.findIndex((_, i) => free(i, from, to))
    if (lane < 0) {
      lane = taken.length
      taken.push(new Set())
      spans.push([])
    }
    if (chain) spans[lane].push([from, to])
    else taken[lane].add(from)
    return lane
  }

  // Features that come once — and small picks like attribute increases, which need no joining line —
  // fill the lanes first; a feature with ranks then takes a stretch of a lane where nothing else sits.
  const chains: ProgressionNode[][] = []
  for (const [family, list] of families) {
    if (family === SUBCLASS_FAMILY) continue
    if (list.length > 1 && !isMinorFamily(list[0])) chains.push(list)
    else for (const node of list) laneOfNode.set(node.id, place(node.level, node.level, false))
  }
  const links: [string, string][] = []
  for (const list of chains) {
    const lane = place(list[0].level, list.at(-1)!.level, true)
    list.forEach((node, i) => {
      laneOfNode.set(node.id, lane)
      if (i > 0) links.push([list[i - 1].id, node.id])
    })
  }
  const subclass = families.get(SUBCLASS_FAMILY)
  if (subclass) for (const node of subclass) laneOfNode.set(node.id, taken.length)

  const cells: BoardCell[] = []
  for (const list of families.values()) {
    const perLevel = new Map<string, ProgressionNode[]>()
    for (const n of list) listAt(perLevel, `${laneOfNode.get(n.id)}:${n.level}`).push(n)
    for (const siblings of perLevel.values()) {
      siblings.forEach((node, slot) =>
        cells.push({ node, lane: laneOfNode.get(node.id)!, slot, slots: siblings.length, tier: tierOf(node, list.length, progression.maxLevel) }),
      )
    }
  }

  const lanes: Lane[] = taken.map(() => ({ kind: 'core', units: 1 }))
  if (subclass) {
    const widest = Math.max(1, ...cells.filter((c) => c.lane === taken.length).map((c) => c.slots))
    lanes.push({ kind: 'subclass', units: Math.min(3, widest) })
  }

  const changes = new Map<number, LevelValue[]>()
  const last = new Map<string, string>()
  for (let level = 1; level <= progression.maxLevel; level++) {
    const values = progression.values.get(level) ?? []
    const changed = values.filter((v) => last.get(v.label) !== v.value)
    for (const v of values) last.set(v.label, v.value)
    if (changed.length > 0) changes.set(level, changed)
  }

  return { lanes, cells, links, changes }
}

/** Board measurements in px: level gutter, row height, heading row. */
export const GUTTER = 60
export const ROW = 86
export const HEADER = 34
/** Narrowest and widest a lane may get while the board stretches to the available width. */
const LANE_MIN = 58
const LANE_MAX = 150
/** Below this lane width the tiles shrink and names get a third line. */
const TIGHT_LANE = 86
/** The values column, roomy and tight. */
const VALUES = 118
const VALUES_TIGHT = 84
const TILE: Record<TileTier, number> = { keystone: 54, major: 46, minor: 36 }
const TILE_TIGHT: Record<TileTier, number> = { keystone: 46, major: 40, minor: 32 }
/** Tile centre below the row's top. */
const TILE_Y = 30

export interface PlacedCell extends BoardCell {
  /** Tile centre. */
  x: number
  y: number
  /** Tile edge length, and the width of the cell (tile plus name) around it. */
  size: number
  width: number
}

export interface BoardGeometry {
  /** Lanes too narrow for full-size tiles. */
  tight: boolean
  laneX: number[]
  laneWidths: number[]
  lanesEnd: number
  /** Width of the values column (0 without values). */
  valuesWidth: number
  width: number
  height: number
  cells: PlacedCell[]
  byId: Map<string, PlacedCell>
}

export const rowTop = (level: number) => HEADER + (level - 1) * ROW

/**
 * Where everything goes for a board `available` px wide: lanes widen to fill it and shrink — tiles
 * too, names wrapping to a third line — before the board would have to scroll sideways.
 */
export function boardGeometry(board: BoardLayout, available: number, maxLevel: number): BoardGeometry {
  const units = board.lanes.reduce((sum, lane) => sum + lane.units, 0)
  const hasValues = board.changes.size > 0
  const fit = (valuesWidth: number) => Math.floor((available - GUTTER - (hasValues ? valuesWidth : 12)) / Math.max(1, units))
  const tight = fit(VALUES) < TIGHT_LANE
  const valuesWidth = hasValues ? (tight ? VALUES_TIGHT : VALUES) : 0
  const unit = Math.max(LANE_MIN, Math.min(LANE_MAX, fit(tight ? VALUES_TIGHT : VALUES)))
  const tiles = tight ? TILE_TIGHT : TILE

  const laneWidths = board.lanes.map((lane) => lane.units * unit)
  const laneX: number[] = []
  let x = GUTTER
  for (const w of laneWidths) {
    laneX.push(x)
    x += w
  }
  const cells = board.cells.map((cell): PlacedCell => {
    const width = laneWidths[cell.lane] / cell.slots
    return { ...cell, x: laneX[cell.lane] + width * (cell.slot + 0.5), y: rowTop(cell.node.level) + TILE_Y, size: tiles[cell.tier], width }
  })
  return {
    tight,
    laneX,
    laneWidths,
    lanesEnd: x,
    valuesWidth,
    width: x + (hasValues ? valuesWidth : 12),
    height: HEADER + maxLevel * ROW,
    cells,
    byId: new Map(cells.map((c) => [c.node.id, c])),
  }
}

/** Where a node stands for a character of `level`. */
export type NodeState = 'unlocked' | 'next' | 'locked'

export function nodeState(node: Pick<ProgressionNode, 'level'>, level: number): NodeState {
  return node.level <= level ? 'unlocked' : node.level === level + 1 ? 'next' : 'locked'
}

/** Ids of the nodes whose name, family or description contains the query (case/accent-insensitive). */
export function searchNodes(nodes: ProgressionNode[], query: string): Set<string> | null {
  const q = fold(query.trim())
  if (!q) return null
  return new Set(nodes.filter((n) => fold(`${n.name} ${n.familyName} ${n.description ?? ''}`).includes(q)).map((n) => n.id))
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
export const roman = (n: number) => ROMAN[n] ?? String(n)
