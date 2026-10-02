import type { ReactNode } from 'react'
import { EditableNumber } from '../../../components/EditableNumber'
import { useT, type TranslateFn, type TranslationKey } from '../../../i18n/useI18n'
import { useCanEdit, useVaultStore } from '../../../store/vaultStore'
import { endeavourItemSummary, type EndeavourItemFrontmatter } from '../../../vault/adapters/endeavourItem'
import { renderObsidianBody } from '../../../vault/components/renderObsidian'
import type { CharacterFrontmatter, InlineItem, InventoryEntry, ItemFrontmatter, VaultFile } from '../../../vault/types'
import { wikilinkTarget } from '../../../vault/wikilinkSyntax'
import type { VaultIndex } from '../../../vault/wikilinks'
import { resolveEndeavourItemLink, resolveItemLink } from '../../../vault/wikilinks'

/** Native-DnD payload for dragging a row onto the other list — see `InventoryPanel`. */
export interface ListMovePayload {
  type: 'list-move'
  section: 'equipped' | 'carried'
  position: number
}

/** Row controls while the list inventory is editable: move to the other list, remove. */
export interface ItemListActions {
  moveLabel: string
  moveIcon: 'up' | 'down'
  onMove: (position: number) => void
  onRemove: (position: number) => void
}

export function ItemList({
  entries,
  index,
  emptyLabel,
  characterPath,
  section,
  actions,
}: {
  entries: InventoryEntry[]
  index: VaultIndex
  emptyLabel: string
  characterPath: string
  section: 'equipped' | 'carried'
  /** Set while the inventory can be edited: each row gets move/remove buttons and can be dragged. */
  actions?: ItemListActions
}) {
  const t = useT()

  if (entries.length === 0) {
    return <p className="text-sm text-fg-muted">{emptyLabel}</p>
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry, i) => {
        let row: ReactNode
        let name: string
        if (typeof entry !== 'string') {
          name = entry.name
          row = <InlineItemRow item={entry} characterPath={characterPath} section={section} rowIndex={i} />
        } else {
          const item = resolveItemLink(index, entry)
          const endeavourItem = item ? undefined : resolveEndeavourItemLink(index, entry)
          name = item?.frontmatter.name ?? endeavourItem?.frontmatter.name ?? wikilinkTarget(entry)
          row = item ? (
            <ItemRow item={item} />
          ) : endeavourItem ? (
            <EndeavourItemRow item={endeavourItem} />
          ) : (
            <div className="py-2 text-sm text-danger">{t('inventory.unresolvedReference', { name: entry })}</div>
          )
        }

        return (
          <li
            key={`${typeof entry === 'string' ? entry : entry.name}-${i}`}
            draggable={Boolean(actions)}
            onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'list-move', section, position: i } satisfies ListMovePayload))}
            className={`flex items-start gap-2 ${actions ? 'cursor-grab' : ''}`}
          >
            <div className="min-w-0 flex-1">{row}</div>
            {actions && (
              <div className="flex shrink-0 items-center gap-1 self-center">
                <RowButton label={`${actions.moveLabel}: ${name}`} title={actions.moveLabel} onClick={() => actions.onMove(i)}>
                  <path d={actions.moveIcon === 'up' ? 'M8 13V3.5M4 7.5 8 3.5l4 4' : 'M8 3v9.5M4 8.5l4 4 4-4'} />
                </RowButton>
                <RowButton label={t('inventory.removeAria', { name })} title={t('inventory.removeAria', { name })} danger onClick={() => actions.onRemove(i)}>
                  <path d="M4 4l8 8M12 4l-8 8" />
                </RowButton>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** A round icon button in a row, sized to hit comfortably (see `ItemTile`'s corner buttons). */
function RowButton({ label, title, danger = false, onClick, children }: { label: string; title: string; danger?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      onClick={onClick}
      className={`flex size-7 cursor-pointer items-center justify-center rounded-full border border-trim/30 bg-surface/85 text-fg-muted transition ${
        danger ? 'hover:border-danger hover:bg-danger hover:text-white' : 'hover:border-trim hover:bg-trim hover:text-surface'
      }`}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
        {children}
      </svg>
    </button>
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
  const t = useT()
  const { name, quantity = 1, weight_lb } = item
  const canEdit = useCanEdit()
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)

  function mutateItem(patch: Partial<InlineItem>) {
    return (c: CharacterFrontmatter): CharacterFrontmatter => {
      const list = c.inventory?.[section]
      if (!list) return c
      const nextList = list.map((entry, i) => (i === rowIndex && typeof entry !== 'string' ? { ...entry, ...patch } : entry))
      return { ...c, inventory: { ...c.inventory, [section]: nextList } }
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 py-2">
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
            {t('inventory.weightUnit')}
          </div>
        ) : (
          <div className="shrink-0 text-xs text-fg-muted">{t('inventory.weightValue', { value: weight_lb * quantity })}</div>
        ))}
    </div>
  )
}

/** Key facts for a given Endeavour-schema item kind, as `"Label: value"` strings — deliberately
 * plain/utilitarian (not styled per-kind) since this whole schema is experimental scaffolding for
 * inventory UI work, not a finished design; see `docs/inventory-vault-alignment.md`. */
function endeavourItemDetails(fm: EndeavourItemFrontmatter, t: TranslateFn): string[] {
  const details: string[] = []
  const add = (key: TranslationKey, value: string | number) => details.push(`${t(key)}: ${value}`)
  if (fm.size) add('endeavourInventory.detailSize', fm.size)
  if (fm.weight_class) add('endeavourInventory.detailWeight', fm.weight_class)
  if (fm.cost) add('endeavourInventory.detailCost', fm.cost)

  switch (fm.kind) {
    case 'weapon':
      if (fm.hands) details.push(t(fm.hands === 'two' ? 'equipment.handsTwoHint' : 'equipment.handsOneHint'))
      if (fm.category) add('endeavourInventory.detailCategory', fm.category)
      if (fm.range) add('endeavourInventory.detailRange', fm.range)
      if (fm.damage_dice) add('endeavourInventory.detailDamage', `${fm.damage_dice}${fm.damage_type ? ` (${fm.damage_type})` : ''}`)
      if (fm.properties && fm.properties.length > 0) add('endeavourInventory.detailProperties', fm.properties.join(', '))
      break
    case 'armor':
      if (fm.armor_category) add('endeavourInventory.detailArmorCategory', fm.armor_category)
      if (fm.rk !== undefined) add('short.armorClass', fm.rk)
      if (fm.rp !== undefined) details.push(`RP: ${fm.rp}`)
      if (fm.damage_reduction !== undefined) add('endeavourInventory.detailDamageReduction', fm.damage_reduction)
      if (fm.strength_requirement !== undefined) add('endeavourInventory.detailStrength', fm.strength_requirement)
      if (fm.bw_cap !== undefined) add('endeavourInventory.detailMaxBw', fm.bw_cap)
      if (fm.stealth_disadvantage) add('endeavourInventory.detailStealth', fm.stealth_disadvantage)
      break
    case 'shield':
      if (fm.rk !== undefined) add('short.armorClass', fm.rk)
      if (fm.rp !== undefined) details.push(`RP: ${fm.rp}`)
      if (fm.damage_reduction !== undefined) add('endeavourInventory.detailDamageReduction', fm.damage_reduction)
      break
    case 'magic_item':
      if (fm.magic_type) add('endeavourInventory.detailMagicType', fm.magic_type)
      if (fm.rarity) add('endeavourInventory.detailRarity', fm.rarity)
      if (fm.requires_attunement) details.push(t('endeavourInventory.detailAttunement'))
      if (fm.cursed) details.push(t('endeavourInventory.detailCursed'))
      if (fm.requirement) add('endeavourInventory.detailRequirement', fm.requirement)
      break
    case 'tool':
      break
  }
  return details
}

function EndeavourItemRow({ item }: { item: VaultFile<EndeavourItemFrontmatter> }) {
  const t = useT()
  const { name } = item.frontmatter
  const details = endeavourItemDetails(item.frontmatter, t)
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-fg">{name}</span>
        <span className="shrink-0 text-xs uppercase text-fg-muted">{endeavourItemSummary(item.frontmatter, t)}</span>
      </div>
      {details.length > 0 && <div className="mt-0.5 text-xs text-fg-muted">{details.join(' · ')}</div>}
      {item.body && <div className="mt-0.5 text-sm text-fg-muted">{renderObsidianBody(item.body)}</div>}
    </div>
  )
}

function ItemRow({ item }: { item: VaultFile<ItemFrontmatter> }) {
  const t = useT()
  const { name, quantity = 1, weight_lb, category } = item.frontmatter
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div>
        <div className="font-medium text-fg">
          {name}
          {quantity > 1 && <span className="ml-1 text-fg-muted">×{quantity}</span>}
        </div>
        {item.body && <div className="mt-0.5 text-sm text-fg-muted">{renderObsidianBody(item.body)}</div>}
      </div>
      <div className="shrink-0 text-right text-xs text-fg-muted">
        {category && <div className="capitalize">{category}</div>}
        {weight_lb !== undefined && <div>{t('inventory.weightValue', { value: weight_lb * quantity })}</div>}
      </div>
    </div>
  )
}
