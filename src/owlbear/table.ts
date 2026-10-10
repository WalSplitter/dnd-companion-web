import type OBRType from '@owlbear-rodeo/sdk'

type Obr = typeof OBRType

/**
 * What a session decides at the table and nowhere else: a character's conditions and their
 * initiative. Unlike the roster (see `live.ts`) none of it goes to the vault — it lasts a fight or a
 * scene — so it sits under a room metadata key of its own, keyed by character name.
 */
export const TABLE_KEY = 'dnd-companion/table'

/** The conditions of rule `Zustände`, by the vault's own names. */
export const CONDITIONS = [
  'Abgelenkt',
  'Bedroht',
  'Belastet',
  'Benommen',
  'Betrunken',
  'Betäubt',
  'Bewusstlos',
  'Bezaubert',
  'Blind',
  'Festgesetzt',
  'Gelähmt',
  'Gepackt',
  'Kampfunfähig',
  'Liegend',
  'Provoziert',
  'Reitend',
  'Sterbend',
  'Taub',
  'Unsichtbar',
  'Verborgen',
  'Verlangsamt',
  'Versteinert',
  'Verängstigt',
] as const

export interface Initiative {
  /** The turn order roll (Instinkt; the one initiative roll in D&D). */
  order?: number
  /** Endeavour: the Beweglichkeit roll and the action points it grants for the first round. */
  actions?: number
  ap?: number
  /** When it was rolled last — trackers on the tokens take a newer roll over (see `initiativeBridge.ts`). */
  at: number
}

export interface TableEntry {
  conditions?: string[]
  initiative?: Initiative
}

export type TableState = Record<string, TableEntry>

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const optionalNumber = (value: unknown) => value === undefined || isNumber(value)

function readEntry(value: unknown): TableEntry | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const v = value as Record<string, unknown>
  const entry: TableEntry = {}
  if (Array.isArray(v.conditions)) entry.conditions = v.conditions.filter((c): c is string => typeof c === 'string')
  const init = v.initiative as Record<string, unknown> | undefined
  if (init && isNumber(init.at) && optionalNumber(init.order) && optionalNumber(init.actions) && optionalNumber(init.ap)) {
    entry.initiative = init as unknown as Initiative
  }
  return entry
}

export function readTable(metadata: Record<string, unknown>): TableState {
  const raw = metadata[TABLE_KEY]
  if (typeof raw !== 'object' || raw === null) return {}
  return Object.fromEntries(Object.entries(raw).flatMap(([name, value]) => {
    const entry = readEntry(value)
    return entry ? [[name, entry]] : []
  }))
}

/** Changes the room's table state, read right before writing (see `writeRoster`). Entries left empty are dropped. */
export async function writeTable(obr: Obr, change: (table: TableState) => TableState): Promise<TableState> {
  const changed = change(readTable(await obr.room.getMetadata()))
  const table = Object.fromEntries(Object.entries(changed).filter(([, entry]) => (entry.conditions?.length ?? 0) > 0 || entry.initiative))
  await obr.room.setMetadata({ [TABLE_KEY]: table })
  return table
}

/** Characters by initiative: turn order first, the action roll breaking ties (rule `Initiative#Gleichstand`);
 * those without initiative last, by name. */
export function byInitiative(table: TableState): (a: string, b: string) => number {
  return (a, b) => {
    const x = table[a]?.initiative
    const y = table[b]?.initiative
    if (x?.order !== undefined && y?.order !== undefined && x.order !== y.order) return y.order - x.order
    if ((x?.order === undefined) !== (y?.order === undefined)) return x?.order === undefined ? 1 : -1
    if (x?.actions !== undefined && y?.actions !== undefined && x.actions !== y.actions) return y.actions - x.actions
    return a.localeCompare(b)
  }
}
