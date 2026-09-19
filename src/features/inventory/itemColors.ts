import type { EndeavourItemFrontmatter } from '../../vault/adapters/endeavourItem'

/**
 * Background/border tint per item kind, so weapons/armor/magic items/plain gear are visually
 * distinguishable at a glance in the slot grid (requested after the first grid draft). Deliberately
 * low-opacity gradients layered over the existing surface tokens rather than solid theme colors, so
 * they stay legible and non-clashing across every theme (dark/light/fluent/purple/...).
 */
export const KIND_TILE_CLASSES: Record<EndeavourItemFrontmatter['kind'], string> = {
  weapon: 'border-red-500/60 bg-linear-to-b from-red-500/30 to-red-500/10',
  armor: 'border-blue-500/60 bg-linear-to-b from-blue-500/30 to-blue-500/10',
  shield: 'border-indigo-500/60 bg-linear-to-b from-indigo-500/30 to-indigo-500/10',
  magic_item: 'border-purple-500/60 bg-linear-to-b from-purple-500/30 to-purple-500/10',
  equipment: 'border-emerald-500/60 bg-linear-to-b from-emerald-500/30 to-emerald-500/10',
  tool: 'border-amber-500/60 bg-linear-to-b from-amber-500/30 to-amber-500/10',
  container: 'border-trim/40 bg-surface-2',
}

/** Player-created temporary items (see `EndeavourCustomItem`): neutral tint + dashed border, so
 * they read as "not yet in the vault" next to the kind-colored real items. */
export const CUSTOM_TILE_CLASSES = 'border-dashed border-fg-muted/70 bg-fg-muted/10'

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
