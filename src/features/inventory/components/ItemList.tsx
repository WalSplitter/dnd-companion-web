import { EditableNumber } from '../../../components/EditableNumber'
import { useVaultStore } from '../../../store/vaultStore'
import { renderObsidianBody } from '../../../vault/components/WikiLink'
import type { CharacterFrontmatter, InlineItem, InventoryEntry, ItemFrontmatter, VaultFile } from '../../../vault/types'
import type { VaultIndex } from '../../../vault/wikilinks'
import { resolveItemLink } from '../../../vault/wikilinks'

export function ItemList({
  entries,
  index,
  emptyLabel,
  characterPath,
  section,
}: {
  entries: InventoryEntry[]
  index: VaultIndex
  emptyLabel: string
  characterPath: string
  section: 'equipped' | 'carried'
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-fg-muted">{emptyLabel}</p>
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry, i) => {
        if (typeof entry !== 'string') {
          return <InlineItemRow key={`${entry.name}-${i}`} item={entry} characterPath={characterPath} section={section} rowIndex={i} />
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

function InlineItemRow({
  item,
  characterPath,
  section,
  rowIndex,
}: {
  item: InlineItem
  characterPath: string
  section: 'equipped' | 'carried'
  rowIndex: number
}) {
  const { name, quantity = 1, weight_lb } = item
  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted'

  function mutateItem(patch: Partial<InlineItem>) {
    return (c: CharacterFrontmatter): CharacterFrontmatter => {
      const list = c.inventory?.[section]
      if (!list) return c
      const nextList = list.map((entry, i) => (i === rowIndex && typeof entry !== 'string' ? { ...entry, ...patch } : entry))
      return { ...c, inventory: { ...c.inventory, [section]: nextList } }
    }
  }

  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="font-medium text-fg">
        {name}
        {canEdit && item._write?.quantity ? (
          <EditableNumber
            key={quantity}
            value={quantity}
            min={1}
            onCommit={(next) => void updateCharacterField(characterPath, item._write!.quantity, next, mutateItem({ quantity: next }))}
            className="ml-1 w-10 rounded-md border border-border bg-surface-2 px-1 text-center text-xs text-fg-muted"
          />
        ) : (
          quantity > 1 && <span className="ml-1 text-fg-muted">×{quantity}</span>
        )}
      </div>
      {weight_lb !== undefined &&
        (canEdit && item._write?.weight_lb ? (
          <div className="flex shrink-0 items-center gap-1 text-xs text-fg-muted">
            <EditableNumber
              key={weight_lb}
              value={weight_lb}
              onCommit={(next) => void updateCharacterField(characterPath, item._write!.weight_lb, next, mutateItem({ weight_lb: next }))}
              className="w-12 rounded-md border border-border bg-surface-2 px-1 text-center text-xs text-fg-muted"
            />
            lb
          </div>
        ) : (
          <div className="shrink-0 text-xs text-fg-muted">{weight_lb * quantity} lb</div>
        ))}
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
        {item.body && <div className="mt-0.5 text-sm text-fg-muted">{renderObsidianBody(item.body)}</div>}
      </div>
      <div className="shrink-0 text-right text-xs text-fg-muted">
        {category && <div className="capitalize">{category}</div>}
        {weight_lb !== undefined && <div>{weight_lb * quantity} lb</div>}
      </div>
    </li>
  )
}
