import type { CharacterFrontmatter } from '../vault/types'

/** The conditions a character has (`conditions.active`), skipping anything that isn't a name — the
 * list is read straight from hand-editable YAML. */
export function activeConditions(character: CharacterFrontmatter): string[] {
  const active: unknown = character.conditions?.active
  return Array.isArray(active) ? active.filter((c): c is string => typeof c === 'string' && c.trim() !== '').map((c) => c.trim()) : []
}

/** Whether two condition lists hold the same conditions, in any order. */
export function sameConditions(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((c) => b.includes(c))
}
