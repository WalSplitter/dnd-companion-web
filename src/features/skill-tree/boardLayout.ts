import { SUBCLASS_FAMILY, type ClassProgression, type LevelValue, type ProgressionNode } from '../../vault/adapters/classProgression'

/**
 * Lays a class's progression out as a talent board: one row per level (1 at the top), features as
 * tiles in lanes. The ranks of a feature line up in one lane and are joined top to bottom; features
 * that come once fill the gaps wherever their level is free; the subclass is always the last lane.
 */

export interface Lane {
  kind: 'core' | 'subclass'
  family?: string
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

/** Ability-score-style picks (`Kernattribut-Steigerung`, `Talent`): small tiles. */
const MINOR_FAMILY = /steigerung|attribut|ability score|^talente?$|^feats?$|zaubergrad|^mana$|zaubertricks/i

export function tierOf(node: ProgressionNode, familySize: number, maxLevel: number): TileTier {
  if (node.source === 'class' && node.kind === 'feature' && familySize === 1 && node.level >= maxLevel) return 'keystone'
  if (MINOR_FAMILY.test(node.familyName) || MINOR_FAMILY.test(node.family)) return 'minor'
  return 'major'
}

export function layoutBoard(progression: ClassProgression): BoardLayout {
  const families = new Map<string, ProgressionNode[]>()
  for (const node of progression.nodes) families.set(node.family, [...(families.get(node.family) ?? []), node])
  const isMinor = (list: ProgressionNode[]) => MINOR_FAMILY.test(list[0].familyName) || MINOR_FAMILY.test(list[0].family)

  /** Levels taken in each lane, and the level spans its joined chains run through. */
  const taken: Set<number>[] = []
  const spans: [number, number][][] = []
  const laneOfNode = new Map<string, number>()
  const free = (lane: number, from: number, to: number) =>
    [...taken[lane]].every((l) => l < from || l > to) && spans[lane].every(([a, b]) => to < a || from > b)
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
    if (list.length > 1 && !isMinor(list)) chains.push(list)
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

  const lanes: Lane[] = taken.map(() => ({ kind: 'core' as const }))
  const subclass = families.get(SUBCLASS_FAMILY)
  if (subclass) {
    for (const node of subclass) laneOfNode.set(node.id, lanes.length)
    lanes.push({ kind: 'subclass', family: SUBCLASS_FAMILY })
  }

  const cells: BoardCell[] = []
  for (const list of families.values()) {
    const perLevel = new Map<string, ProgressionNode[]>()
    for (const n of list) {
      const key = `${laneOfNode.get(n.id)}:${n.level}`
      perLevel.set(key, [...(perLevel.get(key) ?? []), n])
    }
    for (const siblings of perLevel.values()) {
      siblings.forEach((node, slot) =>
        cells.push({ node, lane: laneOfNode.get(node.id)!, slot, slots: siblings.length, tier: tierOf(node, list.length, progression.maxLevel) }),
      )
    }
  }

  const changes = new Map<number, LevelValue[]>()
  const last = new Map<string, string>()
  for (let level = 1; level <= progression.maxLevel; level++) {
    const changed = (progression.values.get(level) ?? []).filter((v) => last.get(v.label) !== v.value)
    for (const v of progression.values.get(level) ?? []) last.set(v.label, v.value)
    if (changed.length > 0) changes.set(level, changed)
  }

  return { lanes, cells, links, changes }
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

export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
export const roman = (n: number) => ROMAN[n] ?? String(n)
