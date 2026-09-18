import { useT } from '../../../i18n/I18nContext'
import { GRID_COLUMNS, type ContainerLayout } from '../grid'
import { ItemTile } from './ItemTile'

/**
 * One equipped container's slot grid (the big `Gepäck` backpack, or one small 1-slot `Schnellzugriff`
 * pouch — both render through this same component, just with a different `columns`/size). Native
 * HTML5 drag-and-drop drop target (no extra dependency): dropping either a search result or an
 * existing tile dragged from another container is reported via `onDropPayload` (the raw
 * `dataTransfer` string — a plain wikilink for a fresh item, or a `MoveTilePayload` JSON string for
 * moving an existing one; the parent tells the two apart, see `EndeavourInventoryGrid.handleDrop`).
 */
export function ContainerGrid({
  label,
  layout,
  containerIndex,
  columns = GRID_COLUMNS,
  selectedLinkIndex,
  onSelectTile,
  onRemoveTile,
  onDropPayload,
}: {
  label: string
  layout: ContainerLayout
  containerIndex: number
  columns?: number
  selectedLinkIndex: number | undefined
  onSelectTile: (linkIndex: number) => void
  onRemoveTile: (linkIndex: number) => void
  onDropPayload: (raw: string) => void
}) {
  const t = useT()
  const tileAtStart = new Map(layout.tiles.map((tile) => [tile.start, tile]))

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const raw = e.dataTransfer.getData('text/plain')
        if (raw) onDropPayload(raw)
      }}
      className="rounded-lg border border-border bg-surface p-2"
    >
      <div className="mb-1 truncate text-xs font-semibold uppercase tracking-wide text-fg-muted" title={label}>
        {label}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: layout.capacity }, (_, cellIndex) => {
          const tile = tileAtStart.get(cellIndex)
          if (tile) {
            return (
              <ItemTile
                key={tile.linkIndex}
                tile={tile}
                containerIndex={containerIndex}
                selected={selectedLinkIndex === tile.linkIndex}
                onSelect={() => onSelectTile(tile.linkIndex)}
                onRemove={() => onRemoveTile(tile.linkIndex)}
              />
            )
          }
          if (layout.occupied[cellIndex]) return null // covered by an earlier tile's span
          return (
            <div
              key={cellIndex}
              aria-label={t('endeavourInventory.emptySlot')}
              className="min-h-12 rounded-md border border-dashed border-border/70"
            />
          )
        })}
      </div>
    </div>
  )
}
