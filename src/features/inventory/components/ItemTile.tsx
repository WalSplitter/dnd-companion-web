import { useT } from '../../../i18n/I18nContext'
import type { ContainerTile } from '../grid'
import { CUSTOM_TILE_CLASSES, KIND_TILE_CLASSES } from '../itemColors'

/** Native-DnD payload for picking up an already-placed tile and dropping it onto a *different*
 * container's `ContainerGrid` — see `EndeavourInventoryGrid.handleDrop`'s `move` branch. Distinct
 * `type` from the search panel's `{ type: 'new' }` payload so a drop target can tell "move this
 * existing item" apart from "place a fresh one". Carries only source indices: the entry itself
 * (wikilink or temporary custom item) is looked up from the character's data on drop. */
export interface MoveTilePayload {
  type: 'move'
  sourceContainerIndex: number
  sourceLinkIndex: number
}

/** One placed item in a container's slot grid — spans `tile.length` grid columns (linear/scalar
 * placement, see `grid.ts`). Click selects it (shown in `ItemDetailPanel`); the small "×" removes
 * it, per the mockup's "Symbol, um Gegenstand zu entfernen" annotation. Draggable onto another
 * container's grid to move it there. Background tint reflects the item's kind (weapon/armor/magic
 * item/plain gear/...), see `itemColors.ts`. */
export function ItemTile({
  tile,
  containerIndex,
  selected,
  onSelect,
  onRemove,
}: {
  tile: ContainerTile
  containerIndex: number
  selected: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const t = useT()
  const name = tile.item?.frontmatter.name ?? t('endeavourInventory.unresolvedItem')
  const kindClasses = tile.custom
    ? CUSTOM_TILE_CLASSES
    : tile.item
      ? KIND_TILE_CLASSES[tile.item.frontmatter.kind]
      : 'border-border bg-surface-2'

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        const payload: MoveTilePayload = { type: 'move', sourceContainerIndex: containerIndex, sourceLinkIndex: tile.linkIndex }
        e.dataTransfer.setData('text/plain', JSON.stringify(payload))
      }}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      style={{ gridColumn: `span ${tile.length}` }}
      className={`relative flex min-h-12 cursor-grab flex-col items-center justify-center rounded-md border px-1 py-1 text-center text-[11px] leading-tight text-fg transition-colors ${kindClasses} ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <span className="line-clamp-2">{name}</span>
      {tile.custom && (
        <span className="text-[9px] uppercase text-fg-muted">{t('endeavourInventory.customBadge')}</span>
      )}
      <button
        type="button"
        aria-label={t('endeavourInventory.removeAria', { name })}
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[10px] text-fg-muted hover:text-danger"
      >
        ×
      </button>
    </div>
  )
}
