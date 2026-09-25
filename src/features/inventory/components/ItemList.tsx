import { EditableNumber } from '../../../components/EditableNumber'
import { useT } from '../../../i18n/useI18n'
import { useCanEdit, useVaultStore } from '../../../store/vaultStore'
import { endeavourItemSummary, type EndeavourItemFrontmatter } from '../../../vault/adapters/endeavourItem'
import { renderObsidianBody } from '../../../vault/components/renderObsidian'
import type { CharacterFrontmatter, InlineItem, InventoryEntry, ItemFrontmatter, VaultFile } from '../../../vault/types'
import type { VaultIndex } from '../../../vault/wikilinks'
import { resolveEndeavourItemLink, resolveItemLink } from '../../../vault/wikilinks'

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
  const t = useT()

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
        if (item) return <ItemRow key={item.path} item={item} />

        const endeavourItem = resolveEndeavourItemLink(index, entry)
        if (endeavourItem) return <EndeavourItemRow key={endeavourItem.path} item={endeavourItem} />

        return (
          <li key={entry} className="py-2 text-sm text-danger">
            {t('inventory.unresolvedReference', { name: entry })}
          </li>
        )
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
            {t('inventory.weightUnit')}
          </div>
        ) : (
          <div className="shrink-0 text-xs text-fg-muted">{t('inventory.weightValue', { value: weight_lb * quantity })}</div>
        ))}
    </li>
  )
}

/** Key facts for a given Endeavour-schema item kind, as `"Label: value"` strings — deliberately
 * plain/utilitarian (not styled per-kind) since this whole schema is experimental scaffolding for
 * inventory UI work, not a finished design; see `docs/inventory-vault-alignment.md`. */
function endeavourItemDetails(fm: EndeavourItemFrontmatter): string[] {
  const details: string[] = []
  if (fm.size) details.push(`Größe: ${fm.size}`)
  if (fm.weight_class) details.push(`Gewicht: ${fm.weight_class}`)
  if (fm.cost) details.push(`Kosten: ${fm.cost}`)

  switch (fm.kind) {
    case 'weapon':
      if (fm.hands) details.push(`Hände: ${fm.hands}`)
      if (fm.category) details.push(`Kategorie: ${fm.category}`)
      if (fm.range) details.push(`Reichweite: ${fm.range}`)
      if (fm.damage_dice) details.push(`Schaden: ${fm.damage_dice}${fm.damage_type ? ` (${fm.damage_type})` : ''}`)
      if (fm.properties && fm.properties.length > 0) details.push(`Eigenschaften: ${fm.properties.join(', ')}`)
      break
    case 'armor':
      if (fm.armor_category) details.push(`Klasse: ${fm.armor_category}`)
      if (fm.rk !== undefined) details.push(`RK: ${fm.rk}`)
      if (fm.rp !== undefined) details.push(`RP: ${fm.rp}`)
      if (fm.damage_reduction !== undefined) details.push(`SR: ${fm.damage_reduction}`)
      if (fm.strength_requirement !== undefined) details.push(`Stärke: ${fm.strength_requirement}`)
      if (fm.bw_cap !== undefined) details.push(`Max BW: ${fm.bw_cap}`)
      if (fm.stealth_disadvantage) details.push(`Heimlichkeit: ${fm.stealth_disadvantage}`)
      break
    case 'shield':
      if (fm.rk !== undefined) details.push(`RK: ${fm.rk}`)
      if (fm.rp !== undefined) details.push(`RP: ${fm.rp}`)
      if (fm.damage_reduction !== undefined) details.push(`SR: ${fm.damage_reduction}`)
      break
    case 'magic_item':
      if (fm.magic_type) details.push(`Art: ${fm.magic_type}`)
      if (fm.rarity) details.push(`Seltenheit: ${fm.rarity}`)
      if (fm.requires_attunement) details.push('Einstimmung: Ja')
      if (fm.cursed) details.push('Verflucht: Ja')
      if (fm.requirement) details.push(`Voraussetzung: ${fm.requirement}`)
      break
    case 'tool':
      break
  }
  return details
}

function EndeavourItemRow({ item }: { item: VaultFile<EndeavourItemFrontmatter> }) {
  const { name } = item.frontmatter
  const details = endeavourItemDetails(item.frontmatter)
  return (
    <li className="py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-fg">{name}</span>
        <span className="shrink-0 text-xs uppercase text-fg-muted">{endeavourItemSummary(item.frontmatter)}</span>
      </div>
      {details.length > 0 && <div className="mt-0.5 text-xs text-fg-muted">{details.join(' · ')}</div>}
      {item.body && <div className="mt-0.5 text-sm text-fg-muted">{renderObsidianBody(item.body)}</div>}
    </li>
  )
}

function ItemRow({ item }: { item: VaultFile<ItemFrontmatter> }) {
  const t = useT()
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
        {weight_lb !== undefined && <div>{t('inventory.weightValue', { value: weight_lb * quantity })}</div>}
      </div>
    </li>
  )
}
