import { hasTag, isRecord, tagList } from '../frontmatterFields'
import { findRawFileByName, type RawFile } from '../rawFile'
import type { CharacterFeature, CharacterFrontmatter, FeatureUsage } from '../types'
import { basename, linkDisplay, linkFile, linksToText } from '../wikilinkSyntax'
import { parsePipeTables } from './markdownTable'
import { noteFeatureUsage, noteSummary } from './nativeCharacter'

/**
 * What a class grants on its way from level 1 to 20, read for the skill tree. Both vaults describe it
 * the same way, so one reader serves both rulesets:
 *
 * - the class note's `## Klassentabelle`: a table with a `Stufe` column and a `Merkmale` column of
 *   `[[Merkmal]]` links (`[[Tatendrang]] (2)` for a feature's second rank). Further columns
 *   (`Hinterhältiger Angriff`, `Zaubereipunkte`, …) are values per level, also as the old vault's
 *   Dataview cells (`` `=this.HinterhältigerAngriff.Stufe3 + "W6"` ``);
 * - the subclass: the class note's `Name_Subklassen: "[[Kampfarchetypen|Kampfarchetyp]]"` names the
 *   link in the table that marks choosing it, and `Merkmal: Kampfarchetyp` rows mark its features.
 *   The chosen subclass (`class[].subclass`) is a note with its own table (`Stufe | Merkmal`) whose
 *   features take those rows' places.
 *
 * The Endeavour vault builds that table with Dataview instead (see `featureNoteTable`): each feature is
 * a note tagged `Regeln/Endeavour/Merkmal/Klasse/...` with `Klasse: "[[Mönch]]"` (or `Alle`) and
 * `Stufe` (one level or a list), level values come from the class note's level-keyed maps
 * (`Mönchswürfel: {1: 1W6, 6: 1W8}`), and its subclasses are listed by a `Subklassen <Klasse>` note.
 *
 * A feature's description and usage come from its note (`Beschreibung`/first paragraph, `Einsatz`), or
 * from the character's own written-out feature of the same name. Without a table, the character's
 * features with a `source` like `Waldläufer 2` are all that's known.
 */

export type ProgressionNodeKind = 'feature' | 'subclass-choice' | 'subclass-placeholder'

export interface ProgressionOption {
  name: string
  text?: string
}

export interface ProgressionNode {
  /** Unique within its class's progression. */
  id: string
  /** As the table shows it, e.g. `Tatendrang (2)`. */
  name: string
  level: number
  /** Ranks of the same feature share a family (the link target, else the name without `(n)`); the
   * subclass's choice and features form one family, `subclass`. */
  family: string
  /** The family's display name. */
  familyName: string
  /** 1-based position within the family. */
  rank: number
  source: 'class' | 'subclass'
  kind: ProgressionNodeKind
  /** Note to open for the full text. */
  note?: string
  description?: string
  usage?: FeatureUsage
  /** Choices the feature offers (a `## Optionen` list on its note). */
  options?: ProgressionOption[]
  /** The note's `Icon:` — a name from the skill tree's icon set, overriding the one it picks itself. */
  icon?: string
}

export interface LevelValue {
  label: string
  value: string
}

export interface ClassProgression {
  className: string
  /** The character's level in this class. */
  level: number
  /** Highest level the tree shows (at least 20). */
  maxLevel: number
  /** What the class calls its subclass (`Kampfarchetyp`), when the class note says. */
  subclassLabel?: string
  /** The chosen subclass, if any, and whether a note with its features was found. */
  subclass?: { name: string; found: boolean }
  nodes: ProgressionNode[]
  /** The table's other columns, per level. */
  values: Map<number, LevelValue[]>
  /** False when no table exists and the nodes come from the character's own features. */
  fromTable: boolean
  /** Whether the vault has a note for the class at all. */
  noteFound: boolean
}

export const SUBCLASS_FAMILY = 'subclass'

/** What of a character its progressions are read from. */
export type ProgressionSource = Pick<CharacterFrontmatter, 'class' | 'features'>

const EMPTY_CELL = /^[-–—\s]*$/

interface TableRow {
  level: number
  items: CellItem[]
  values: { label: string; cell: string }[]
}

/** The first table with a level column and a feature column, as rows of `{ level, items, values }`. */
function levelTable(body: string): TableRow[] | undefined {
  for (const table of parsePipeTables(body)) {
    const header = table.header.map(linksToText)
    const levelCol = header.findIndex((h) => /^(stufe|level)$/i.test(h))
    const featureCol = header.findIndex((h) => /^(merkmale?|features?)$/i.test(h))
    if (levelCol < 0 || featureCol < 0) continue
    return table.rows.flatMap((row) => {
      const level = Number.parseInt(row[levelCol] ?? '', 10)
      if (!Number.isFinite(level)) return []
      const values = header.flatMap((label, i) => (i === levelCol || i === featureCol || !label ? [] : [{ label, cell: row[i] ?? '' }]))
      return [{ level, items: cellItems(row[featureCol] ?? ''), values }]
    })
  }
  return undefined
}

const CLASS_FEATURE_TAG = 'Regeln/Endeavour/Merkmal/Klasse'

/** `Stufe: 4` or `Stufe: [4, 8, 12]`. */
function levelsOf(value: unknown): number[] {
  return (Array.isArray(value) ? value : [value]).filter((v): v is number => typeof v === 'number' && Number.isInteger(v))
}

/** Whether a feature note's `Klasse` (one entry or a list) links to the class itself. */
function namesClass(value: unknown, className: string): boolean {
  const target = className.toLowerCase()
  return (Array.isArray(value) ? value : [value]).some((v) => typeof v === 'string' && basename(linkFile(v)).toLowerCase() === target)
}

/** Whether a feature note's `Klasse` is `Alle` (every class gets it) or links to the class. */
function belongsToClass(value: unknown, className: string): boolean {
  return (Array.isArray(value) ? value : [value]).some((v) => typeof v === 'string' && v.trim() === 'Alle') || namesClass(value, className)
}

/** The class note's level-keyed maps (`Mönchswürfel: {1: 1W6, 6: 1W8}`) as a value per level, each
 * level carrying the last value at or below it, like the vault's own table. */
function levelMaps(data: Record<string, unknown>, maxLevel: number): Map<number, { label: string; cell: string }[]> {
  const byLevel = new Map<number, { label: string; cell: string }[]>()
  for (const [label, map] of Object.entries(data)) {
    if (!isRecord(map) || Array.isArray(map)) continue
    const steps = Object.entries(map)
    if (steps.length === 0 || !steps.every(([k, v]) => /^\d+$/.test(k) && (typeof v === 'string' || typeof v === 'number'))) continue
    const sorted = steps.map(([k, v]) => [Number(k), String(v)] as const).sort((a, b) => a[0] - b[0])
    for (let level = sorted[0][0]; level <= maxLevel; level++) {
      const cell = [...sorted].reverse().find(([l]) => l <= level)![1]
      byLevel.set(level, [...(byLevel.get(level) ?? []), { label, cell }])
    }
  }
  return byLevel
}

/**
 * The Endeavour vault's class table, rebuilt as its Dataview query does: per level the class's own
 * features (no `Subklasse`; the ones for `Alle` first, then by name) and, at level 3 and wherever a
 * subclass feature sits, a link to the `Subklassen <Klasse>` note (the first one is choosing it).
 * A feature with `Ersetzt: "[[Schlaghagel]]"` ranks up the one it replaces. `undefined` when no
 * feature note names the class itself — the `Alle` ones alone (attribute increases) are no table, and
 * the character's own features are the better guess then.
 */
function featureNoteTable(classNote: RawFile, files: RawFile[]): { rows: TableRow[]; subclassList?: string; families: Map<string, string> } | undefined {
  const className = classNote.name
  const features = files.filter((f) => hasTag(tagList(f.data), CLASS_FEATURE_TAG) && levelsOf(f.data.Stufe).length > 0 && belongsToClass(f.data.Klasse, className))
  const own = features.filter((f) => !f.data.Subklasse)
  if (!own.some((f) => namesClass(f.data.Klasse, className))) return undefined

  // `Verbesserter Schlaghagel` → `Schlaghagel` (followed back to the first of a chain).
  const families = new Map<string, string>()
  for (const f of own) {
    let root = f.name
    for (let seen = new Set<string>(); !seen.has(root.toLowerCase()); ) {
      seen.add(root.toLowerCase())
      const replaced = findRawFileByName(files, root)?.data.Ersetzt
      if (!replaced) break
      root = basename(linkFile(replaced))
    }
    if (root !== f.name) families.set(f.name.toLowerCase(), root)
  }

  const subclassList = findRawFileByName(files, `Subklassen ${className}`)?.name
  const maxLevel = Math.max(20, ...features.flatMap((f) => levelsOf(f.data.Stufe)))
  const values = levelMaps(classNote.data, maxLevel)
  const rows: TableRow[] = []
  for (let level = 1; level <= maxLevel; level++) {
    const here = features.filter((f) => levelsOf(f.data.Stufe).includes(level))
    const isAll = (f: RawFile) => (f.data.Klasse === 'Alle' ? 0 : 1)
    const items: CellItem[] = here
      .filter((f) => !f.data.Subklasse)
      .sort((a, b) => isAll(a) - isAll(b) || a.name.localeCompare(b.name, 'de'))
      .map((f) => ({ name: f.name, target: f.name }))
    if (subclassList && (level === 3 || here.some((f) => f.data.Subklasse))) {
      items.push({ name: level === 3 ? `${className} Subklasse` : 'Subklassen Merkmal', target: subclassList })
    }
    if (items.length > 0 || values.has(level)) rows.push({ level, items, values: values.get(level) ?? [] })
  }
  return { rows, subclassList, families }
}

/** Value at `this.a.b` in the note's frontmatter. */
function lookup(data: Record<string, unknown>, path: string): unknown {
  let node: unknown = data
  for (const key of path.split('.').slice(1)) {
    if (!isRecord(node)) return undefined
    node = node[key]
  }
  return node
}

/**
 * The old vault's Dataview cells: `` `=this.Kampfrausch.Stufe1.Anzahl` `` and
 * `` `=this.X.Stufe3 + "W6"` `` (JavaScript `+`: numbers add, anything with a string joins). Text
 * around it stays. `undefined` when a path doesn't resolve or the expression is anything else.
 */
export function evaluateCell(cell: string, data: Record<string, unknown>): string | undefined {
  let failed = false
  const text = cell.replace(/`=\s*([^`]+)`/g, (_m, expr: string) => {
    let result: unknown
    // Split on `+` outside string literals (`"+1"` stays one part).
    for (const part of expr.split(/\+(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((p) => p.trim())) {
      let value: unknown
      if (/^this(\.[\p{L}\p{N}_]+)+$/u.test(part)) value = lookup(data, part)
      else if (/^"[^"]*"$/.test(part)) value = part.slice(1, -1)
      else if (/^-?\d+(\.\d+)?$/.test(part)) value = Number(part)
      if (typeof value !== 'string' && typeof value !== 'number') {
        failed = true
        return ''
      }
      result = result === undefined ? value : typeof result === 'number' && typeof value === 'number' ? result + value : `${result}${value}`
    }
    return String(result)
  })
  if (failed || /`|INPUT\[/.test(text)) return undefined
  const clean = linksToText(text)
  return EMPTY_CELL.test(clean) ? undefined : clean
}

interface CellItem {
  name: string
  target?: string
  /** `Merkmal: Kampfarchetyp` — a subclass feature row (what follows `Merkmal`). */
  placeholder?: string
}

/** A feature cell's items: comma-separated links (with an optional `(2)` after them) or plain text. */
function cellItems(cell: string): CellItem[] {
  const items: string[] = []
  let depth = 0
  let current = ''
  for (let i = 0; i < cell.length; i++) {
    if (cell.startsWith('[[', i)) depth++
    if (cell.startsWith(']]', i)) depth = Math.max(0, depth - 1)
    if (cell[i] === ',' && depth === 0) {
      items.push(current)
      current = ''
    } else current += cell[i]
  }
  items.push(current)

  return items.flatMap((raw): CellItem[] => {
    const item = raw.trim()
    if (EMPTY_CELL.test(item)) return []
    const link = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*(.*)$/.exec(item)
    if (link) {
      const target = basename(link[1])
      const display = (link[2] ?? target).trim()
      return [{ name: link[3] ? `${display} ${link[3].trim()}` : display, target }]
    }
    // `Merkmal: Kampfarchetyp`, `Merkmal Schutzherr`, `Pfadmerkmal`: the subclass's feature of that level.
    const text = linksToText(item)
    if (/merkmal/i.test(text)) return [{ name: text, placeholder: text.replace(/^merkmal\s*:?\s*/i, '').trim() || text }]
    return [{ name: text }]
  })
}

/** `Tatendrang (2)` → `Tatendrang`. */
export const stripRank = (name: string) => name.replace(/\s*\(\d+\)\s*$/, '').trim()

/** The choices a feature's note lists under an `Optionen`/`Auswahl` heading: `- **Name**: text` or `- [[Name]]`. */
function noteOptions(note: RawFile): ProgressionOption[] | undefined {
  const section = /^#{2,4}\s*(optionen|auswahl|wahlmöglichkeiten|options)\b.*$/im.exec(note.body)
  if (!section) return undefined
  const rest = note.body.slice(section.index + section[0].length)
  const end = rest.search(/^#{1,4}\s/m)
  const options = (end < 0 ? rest : rest.slice(0, end)).split(/\r?\n/).flatMap((line): ProgressionOption[] => {
    const bold = /^\s*[-*]\s+\*\*(.+?)\*\*\s*[:—–-]?\s*(.*)$/.exec(line)
    if (bold) return [{ name: bold[1].replace(/:$/, '').trim(), text: bold[2].trim() || undefined }]
    const link = /^\s*[-*]\s+(\[\[[^\]]+\]\])\s*[:—–-]?\s*(.*)$/.exec(line)
    return link ? [{ name: linkDisplay(link[1]), text: link[2].trim() || undefined }] : []
  })
  return options.length > 0 ? options : undefined
}

function describe(target: string | undefined, name: string, files: RawFile[], ownFeatures: CharacterFeature[]): Pick<ProgressionNode, 'note' | 'description' | 'usage' | 'options' | 'icon'> {
  const note = target ? findRawFileByName(files, target) : undefined
  if (note) {
    const icon = typeof note.data.Icon === 'string' ? note.data.Icon.trim() : undefined
    return { note: note.name, description: noteSummary(note), usage: noteFeatureUsage(note.data), options: noteOptions(note), ...(icon ? { icon } : {}) }
  }
  const own = ownFeatures.find((f) => f.name.toLowerCase() === stripRank(name).toLowerCase())
  return { note: target, description: own?.description, usage: own?.usage }
}

function familyOf(item: CellItem, families?: Map<string, string>): string {
  const key = (item.target ?? stripRank(item.name)).toLowerCase()
  return families?.get(key)?.toLowerCase() ?? key
}

/** Adds rank numbers and ids, in level order. */
function numberNodes(nodes: Omit<ProgressionNode, 'id' | 'rank'>[]): ProgressionNode[] {
  const ranks = new Map<string, number>()
  return [...nodes]
    .sort((a, b) => a.level - b.level)
    .map((node) => {
      const rank = (ranks.get(node.family) ?? 0) + 1
      ranks.set(node.family, rank)
      return { ...node, rank, id: `${node.family}#${rank}` }
    })
}

/** Nodes from the character's features whose `source` names this class and a level (`Waldläufer 2`). */
function featureNodes(className: string, features: CharacterFeature[]): Omit<ProgressionNode, 'id' | 'rank'>[] {
  const prefix = className.toLowerCase()
  return features.flatMap((f) => {
    const match = /^(.*?)\s+(\d+)$/.exec(f.source?.trim() ?? '')
    if (!match || match[1].toLowerCase() !== prefix) return []
    const family = stripRank(f.name).toLowerCase()
    return [{ name: f.name, level: Number(match[2]), family, familyName: stripRank(f.name), source: 'class' as const, kind: 'feature' as const, description: f.description, usage: f.usage }]
  })
}

function classProgression(entry: CharacterFrontmatter['class'][number], character: ProgressionSource, files: RawFile[]): ClassProgression {
  const ownFeatures = character.features ?? []
  const classNote = findRawFileByName(files, entry.name)
  const bodyTable = classNote ? levelTable(classNote.body) : undefined
  const notesTable = classNote && !bodyTable ? featureNoteTable(classNote, files) : undefined
  const table = notesTable?.rows ?? bodyTable
  const subclassList = (notesTable?.subclassList ?? (classNote ? linkFile(classNote.data.Name_Subklassen) : '')).toLowerCase()
  const subclassLabel = classNote ? linkDisplay(classNote.data.Name_Subklassen) || undefined : undefined
  const subclassNote = entry.subclass ? findRawFileByName(files, entry.subclass) : undefined
  const subclassTable = subclassNote ? levelTable(subclassNote.body) : undefined
  const values = new Map<number, LevelValue[]>()

  const addValues = (level: number, cells: { label: string; cell: string }[], data: Record<string, unknown>) => {
    for (const { label, cell } of cells) {
      const value = evaluateCell(cell, data)
      // A `0` (no slots of a grade yet, no wild shape) says nothing worth showing.
      if (value !== undefined && value !== '0') values.set(level, [...(values.get(level) ?? []), { label, value }])
    }
  }

  const nodes: Omit<ProgressionNode, 'id' | 'rank'>[] = []
  const subclassLevels = new Set(subclassTable?.map((row) => row.level))
  let choiceSeen = false
  for (const row of table ?? []) {
    addValues(row.level, row.values, classNote!.data)
    for (const raw of row.items) {
      const linksSubclass = Boolean(raw.target && ((subclassList && raw.target.toLowerCase() === subclassList) || /^((sub|unter)klassen?|subclass(es)?)$/i.test(raw.target)))
      // The first link to the subclass list is choosing it; later ones (the old vault links it again at
      // every subclass level) stand for its features.
      const isChoice: boolean = linksSubclass && !choiceSeen
      choiceSeen ||= isChoice
      const item = linksSubclass && !isChoice ? { ...raw, placeholder: raw.name } : raw
      if (item.placeholder || isChoice) {
        // A chosen subclass's own row replaces the placeholder for that level.
        if (item.placeholder && subclassLevels.has(row.level)) continue
        nodes.push({
          name: isChoice ? (subclassLabel ?? item.name) : item.name,
          level: row.level,
          family: SUBCLASS_FAMILY,
          familyName: subclassLabel ?? item.placeholder ?? item.name,
          source: 'subclass',
          kind: isChoice ? 'subclass-choice' : 'subclass-placeholder',
          ...(isChoice ? describe(item.target, item.name, files, ownFeatures) : {}),
        })
        continue
      }
      const family = familyOf(item, notesTable?.families)
      // A replacing feature (`Verbesserter Schlaghagel`) joins the family of the one it replaces.
      const familyName = notesTable?.families.get((item.target ?? '').toLowerCase()) ?? stripRank(item.name)
      nodes.push({ name: item.name, level: row.level, family, familyName, source: 'class', kind: 'feature', ...describe(item.target, item.name, files, ownFeatures) })
    }
  }

  for (const row of subclassTable ?? []) {
    addValues(row.level, row.values, subclassNote!.data)
    for (const item of row.items) {
      nodes.push({ name: item.name, level: row.level, family: SUBCLASS_FAMILY, familyName: subclassNote!.name, source: 'subclass', kind: 'feature', ...describe(item.target, item.name, files, ownFeatures) })
    }
  }

  const fromTable = Boolean(table && table.length > 0)
  const all = numberNodes(fromTable ? nodes : featureNodes(entry.name, ownFeatures))
  const level = typeof entry.level === 'number' ? entry.level : 0
  return {
    className: entry.name,
    level,
    maxLevel: Math.max(20, level, ...all.map((n) => n.level)),
    subclassLabel,
    subclass: entry.subclass ? { name: entry.subclass, found: Boolean(subclassTable) } : undefined,
    nodes: all,
    values,
    fromTable,
    noteFound: Boolean(classNote),
  }
}

/** One progression per class the character has, in the character's class order. */
export function resolveClassProgressions(character: ProgressionSource, files: RawFile[]): ClassProgression[] {
  return (character.class ?? []).filter((c) => c.name).map((c) => classProgression(c, character, files))
}
