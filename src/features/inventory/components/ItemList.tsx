import type { InlineItem, InventoryEntry, ItemFrontmatter, VaultFile } from '../../../vault/types'
import type { VaultIndex } from '../../../vault/wikilinks'
import { resolveItemLink } from '../../../vault/wikilinks'

export function ItemList({
  entries,
  index,
  emptyLabel,
}: {
  entries: InventoryEntry[]
  index: VaultIndex
  emptyLabel: string
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-fg-muted">{emptyLabel}</p>
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry, i) => {
        if (typeof entry !== 'string') {
          return <InlineItemRow key={`${entry.name}-${i}`} item={entry} />
        }
        const item = resolveItemLink(index, entry)
        if (!item) {
          return (
            <li key={entry} className="py-2 text-sm text-danger">
              Unresolved reference: {entry}
            </li>
          )
        }
        return <ItemRow key={item.path} item={item} />
      })}
    </ul>
  )
}

function InlineItemRow({ item }: { item: InlineItem }) {
  const { name, quantity = 1, weight_lb } = item
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="font-medium text-fg">
        {name}
        {quantity > 1 && <span className="ml-1 text-fg-muted">×{quantity}</span>}
      </div>
      {weight_lb !== undefined && <div className="shrink-0 text-xs text-fg-muted">{weight_lb * quantity} lb</div>}
    </li>
  )
}

function ItemRow({ item }: { item: VaultFile<ItemFrontmatter> }) {
  const { name, quantity = 1, weight_lb, category } = item.frontmatter
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div>
        <div className="font-medium text-fg">
          {name}
          {quantity > 1 && <span className="ml-1 text-fg-muted">×{quantity}</span>}
        </div>
        {item.body && <p className="mt-0.5 text-sm text-fg-muted">{item.body}</p>}
      </div>
      <div className="shrink-0 text-right text-xs text-fg-muted">
        {category && <div className="capitalize">{category}</div>}
        {weight_lb !== undefined && <div>{weight_lb * quantity} lb</div>}
      </div>
    </li>
  )
}
