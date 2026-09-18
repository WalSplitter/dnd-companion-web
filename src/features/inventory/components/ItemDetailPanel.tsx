import { endeavourItemSummary, resolveSlotCost, type EndeavourItemFrontmatter } from '../../../vault/adapters/endeavourItem'
import { useT, type TranslationKey } from '../../../i18n/I18nContext'
import { renderObsidianBody } from '../../../vault/components/WikiLink'
import type { VaultFile } from '../../../vault/types'

export interface SelectedGridItem {
  link: string
  item: VaultFile<EndeavourItemFrontmatter> | undefined
}

/** Shows the currently selected item's details — selection can come from clicking a placed tile
 * (`ContainerGrid`) or a search result (`ItemSearchPanel`), both feeding the same shape up into
 * `EndeavourInventoryGrid`. */
export function ItemDetailPanel({ selected }: { selected: SelectedGridItem | null }) {
  const t = useT()

  if (!selected) {
    return (
      <div className="rounded-lg border border-border bg-surface p-3 text-sm text-fg-muted">{t('endeavourInventory.noSelection')}</div>
    )
  }

  if (!selected.item) {
    return (
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="font-medium text-danger">{t('inventory.unresolvedReference', { name: selected.link })}</div>
      </div>
    )
  }

  const fm = selected.item.frontmatter
  const slots = resolveSlotCost(fm)

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-fg">{fm.name}</span>
        <span className="shrink-0 text-xs uppercase text-fg-muted">{endeavourItemSummary(fm)}</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-fg-muted">
        {fm.cost && (
          <>
            <dt>{t('endeavourInventory.detailCost')}</dt>
            <dd className="text-right text-fg">{fm.cost}</dd>
          </>
        )}
        {slots !== undefined && (
          <>
            <dt>{t('endeavourInventory.detailSlots')}</dt>
            <dd className="text-right text-fg">{slots}</dd>
          </>
        )}
        {fm.kind === 'equipment' && fm.stack_size !== undefined && fm.stack_size > 1 && (
          <>
            <dt>{t('endeavourInventory.detailStackSize')}</dt>
            <dd className="text-right text-fg">{fm.stack_size}</dd>
          </>
        )}
        {fm.kind === 'container' && fm.max_size && (
          <>
            <dt>{t('endeavourInventory.detailMaxSize')}</dt>
            <dd className="text-right text-fg">{t(`endeavourInventory.size.${fm.max_size}` as TranslationKey)}</dd>
          </>
        )}
      </dl>
      {selected.item.body && <div className="mt-2 text-sm text-fg-muted">{renderObsidianBody(selected.item.body)}</div>}
    </div>
  )
}
