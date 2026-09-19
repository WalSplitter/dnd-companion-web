import { useState } from 'react'
import { SectionTitle } from '../../../components/SectionTitle'
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
 * `compact` swaps the section heading for a small caption, for the narrow quick-access pouches.
 */
export function ContainerGrid({
  label,
  layout,
  containerIndex,
  columns = GRID_COLUMNS,
  compact = false,
  selectedLinkIndex,
  onSelectTile,
  onRemoveTile,
  onDropPayload,
}: {
  label: string
  layout: ContainerLayout
  containerIndex: number
  columns?: number
  compact?: boolean
  selectedLinkIndex: number | undefined
  onSelectTile: (linkIndex: number) => void
  onRemoveTile: (linkIndex: number) => void
  onDropPayload: (raw: string) => void
}) {
  const t = useT()
  const [dragOver, setDragOver] = useState(false)
  const tileAtStart = new Map(layout.tiles.map((tile) => [tile.start, tile]))

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const raw = e.dataTransfer.getData('text/plain')
        if (raw) onDropPayload(raw)
      }}
      className={`rpg-panel transition-shadow ${compact ? 'p-2' : 'p-3'} ${dragOver ? 'shadow-[0_0_0_2px_var(--color-trim),0_0_22px_-2px_var(--color-trim)]' : ''}`}
    >
      {compact ? (
        <div className="mb-1.5 break-words font-display text-[0.65rem] font-bold uppercase leading-tight tracking-wider text-trim" title={label}>
          {label}
        </div>
      ) : (
        <SectionTitle className="mb-2.5">{label}</SectionTitle>
      )}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
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
          return <div key={cellIndex} aria-label={t('endeavourInventory.emptySlot')} className="rpg-slot min-h-14" />
        })}
      </div>
    </div>
  )
}
