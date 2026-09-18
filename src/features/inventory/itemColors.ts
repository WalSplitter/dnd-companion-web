import type { EndeavourItemFrontmatter } from '../../vault/adapters/endeavourItem'

/**
 * Background/border tint per item kind, so weapons/armor/magic items/plain gear are visually
 * distinguishable at a glance in the slot grid (requested after the first grid draft). Deliberately
 * low-opacity tints layered over the existing surface tokens rather than solid theme colors, so they
 * stay legible and non-clashing across every theme (dark/light/fluent/purple/...).
 */
export const KIND_TILE_CLASSES: Record<EndeavourItemFrontmatter['kind'], string> = {
  weapon: 'border-red-500/50 bg-red-500/15',
  armor: 'border-blue-500/50 bg-blue-500/15',
  shield: 'border-indigo-500/50 bg-indigo-500/15',
  magic_item: 'border-purple-500/50 bg-purple-500/15',
  equipment: 'border-emerald-500/50 bg-emerald-500/15',
  tool: 'border-amber-500/50 bg-amber-500/15',
  container: 'border-border bg-surface-2',
}

/** Solid-color swatch classes for the same kinds, used as a small legend dot in the search results
 * list (a tile-sized tint would be too subtle at that size). */
export const KIND_DOT_CLASSES: Record<EndeavourItemFrontmatter['kind'], string> = {
  weapon: 'bg-red-500',
  armor: 'bg-blue-500',
  shield: 'bg-indigo-500',
  magic_item: 'bg-purple-500',
  equipment: 'bg-emerald-500',
  tool: 'bg-amber-500',
  container: 'bg-fg-muted',
}
