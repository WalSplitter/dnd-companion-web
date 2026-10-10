import { useT } from '../../../i18n/useI18n'
import type { ContainerTile } from '../grid'
import { encodeDragPayload } from '../dragPayload'
import { CUSTOM_TILE_CLASSES, KIND_TILE_CLASSES } from '../itemColors'

/** The round remove/equip buttons in a tile's corners: a 20px circle, with an invisible `::before`
 * that widens the clickable area to ~32px so it doesn't take careful aiming. With a mouse they only
 * show on hover, keyboard focus or selection, so they don't cover the item's name the rest of the
 * time; on touch screens (no hover) they always show. */
const CORNER_BUTTON =
  "absolute right-0.5 flex size-5 cursor-pointer items-center justify-center rounded-full border bg-surface/85 transition before:absolute before:-inset-1.5 before:content-[''] focus-visible:opacity-100 group-hover:opacity-100 group-focus-visible:opacity-100"
/** Mouse only: hidden until hovered (see `CORNER_BUTTON`). */
const CORNER_BUTTON_HIDDEN = '[@media(hover:hover)]:opacity-0'

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
  onEquip,
  canEdit,
}: {
  tile: ContainerTile
  containerIndex: number
  selected: boolean
  onSelect: () => void
  onRemove: () => void
  /** Set for armor, shields and weapons while editing is unlocked: equips the item (double-click, or
   * the small button in the corner) — see `equipment.ts`. */
  onEquip?: () => void
  /** Hides the remove control and disables dragging — the tile is still clickable to view its
   * details, just not rearrangeable, while editing is locked (see `EndeavourInventoryGrid`). */
  canEdit: boolean
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
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', encodeDragPayload({ type: 'move', sourceContainerIndex: containerIndex, sourceLinkIndex: tile.linkIndex }))
      }}
      onClick={onSelect}
      onDoubleClick={onEquip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      style={{ gridColumn: `span ${tile.length}` }}
      className={`group relative flex min-h-14 min-w-0 flex-col items-center justify-center rounded-md border px-1.5 py-1 text-center text-[11px] font-medium leading-tight text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_2px_6px_-2px_rgb(0_0_0/0.6)] transition hover:brightness-125 ${canEdit ? 'cursor-grab' : 'cursor-pointer'} ${kindClasses} ${
        selected ? 'ring-2 ring-trim' : ''
      }`}
    >
      {/* Narrow one-slot tiles can't fit long single words ("Blendlaterne"): hyphenate, else break anywhere. */}
      <span className="line-clamp-2 max-w-full hyphens-auto [overflow-wrap:anywhere]">{name}</span>
      {tile.custom && (
        <span className="text-[9px] uppercase text-fg-muted">{t('endeavourInventory.customBadge')}</span>
      )}
      {tile.charges !== undefined && (
        <span className="rpg-plate absolute bottom-0.5 left-0.5 px-1 text-[9px] font-semibold leading-tight text-fg">{tile.charges}</span>
      )}
      {onEquip && (
        <button
          type="button"
          aria-label={t('equipment.equipAria', { name })}
          title={t('equipment.equipAria', { name })}
          onClick={(e) => {
            e.stopPropagation()
            onEquip()
          }}
          className={`${CORNER_BUTTON} ${selected ? '' : CORNER_BUTTON_HIDDEN} bottom-0.5 border-trim/40 text-trim hover:border-trim hover:bg-trim hover:text-surface`}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
            <path d="M8 13.5v-9M4.5 8 8 4.5 11.5 8" />
          </svg>
        </button>
      )}
      {canEdit && (
        <button
          type="button"
          aria-label={t('endeavourInventory.removeAria', { name })}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className={`${CORNER_BUTTON} ${selected ? '' : CORNER_BUTTON_HIDDEN} top-0.5 border-trim/30 text-fg-muted hover:border-danger hover:bg-danger hover:text-white`}
        >
          {/* An SVG cross rather than a "×" glyph: the glyph sits off-center in the circle, pushed by
              the font's line metrics. */}
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-2.5" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </div>
  )
}
