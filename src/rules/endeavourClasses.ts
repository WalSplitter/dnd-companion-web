import type { CharacterFrontmatter, ResourceRecovery } from '../vault/types'
import { nimbleAttributeValue } from './endeavour'

/**
 * Endeavour class rules the vault only states in prose, so their numbers live here. Each is tied to
 * the vault note that describes it; the level it unlocks at comes from that note's `Stufe`.
 */

export interface ClassResourceRule {
  /** Key under the character's `resources:`. */
  key: string
  name: string
  className: string
  /** The feature note granting the resource; its `Stufe` is the level it unlocks at. Costs in a
   * feature's `Einsatz` link to it (`"1 [[Ki|Kipunkt]]"`). */
  featureNote: string
  max: (character: CharacterFrontmatter) => number
  recovery: Partial<Record<'breather' | 'field' | 'safe', ResourceRecovery>>
  /** Tag of the actions that spend it; the sheet lists them once the resource is unlocked. */
  actionTag?: string
}

export const CLASS_RESOURCE_RULES: ClassResourceRule[] = [
  {
    // Note `Ki`: max = EN; a Sichere Rast restores all, a Feldrast half the max (rounded up),
    // Verschnaufen 1 point.
    key: 'ki',
    name: 'Ki',
    className: 'Mönch',
    featureNote: 'Ki',
    max: (c) => Math.max(0, nimbleAttributeValue(c, 'en')),
    recovery: { breather: 1, field: 'half', safe: 'all' },
    actionTag: 'Regeln/Endeavour/Merkmal/Klasse/Mönch/Ki-Aktion',
  },
]

/** How many points a rest gives back (before capping at the max). */
export function recoveryAmount(recovery: ResourceRecovery, max: number): number {
  if (recovery === 'all') return max
  if (recovery === 'half') return Math.ceil(max / 2)
  return recovery
}

/**
 * Note `Kampfkunst`: unarmed attacks deal the class note's die for the character's level (`Mönchswürfel:
 * {1: 1W6, 6: 1W8, …}`) plus the subclass's `Kernattribut` (ST or GE before a subclass, via `Finesse`),
 * instead of the usual 1 + ST.
 */
export const MARTIAL_ARTS = { className: 'Mönch', dieField: 'Mönchswürfel' }

/** The die of a level-keyed map (`{1: 1W6, 6: 1W8}`) at `level`: the last step at or below it. */
export function dieAtLevel(map: unknown, level: number): string | undefined {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return undefined
  const steps = Object.entries(map as Record<string, unknown>)
    .filter(([k, v]) => /^\d+$/.test(k) && typeof v === 'string')
    .map(([k, v]) => [Number(k), v as string] as const)
    .filter(([l]) => l <= level)
    .sort((a, b) => b[0] - a[0])
  return steps[0]?.[1]
}
