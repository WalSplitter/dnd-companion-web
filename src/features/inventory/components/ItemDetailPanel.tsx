import { endeavourItemSummary, resolveSlotCost, type EndeavourItemFrontmatter } from '../../../vault/adapters/endeavourItem'
import { useT, type TranslationKey } from '../../../i18n/I18nContext'
import { renderObsidianBody } from '../../../vault/components/WikiLink'
import type { VaultFile } from '../../../vault/types'

export interface SelectedGridItem {
  /** Selection identity — a vault item's wikilink, or a temporary item's `custom:` key (see `entryKey`). */
  key: string
  item: VaultFile<EndeavourItemFrontmatter> | undefined
  /** True for a player-created temporary item that has no vault page (yet). */
  custom?: boolean
}

/** Shows the currently selected item's details — selection can come from clicking a placed tile
 * (`ContainerGrid`) or a search result (`ItemSearchPanel`), both feeding the same shape up into
 * `EndeavourInventoryGrid`. */
export function ItemDetailPanel({ selected }: { selected: SelectedGridItem | null }) {
  const t = useT()

  if (!selected) {
    return <div className="rpg-panel p-4 text-sm italic text-fg-muted">{t('endeavourInventory.noSelection')}</div>
  }

  if (!selected.item) {
    return (
      <div className="rpg-panel p-4">
        <div className="font-medium text-danger">{t('inventory.unresolvedReference', { name: selected.key })}</div>
      </div>
    )
  }

  const fm = selected.item.frontmatter
  const slots = resolveSlotCost(fm)

  return (
    <div className="rpg-panel p-4">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-trim/25 pb-2">
        <span className="font-display text-base font-bold tracking-wide text-fg">{fm.name}</span>
        <span className="rounded-sm bg-trim/15 px-1.5 py-px text-[0.65rem] font-medium uppercase tracking-wider text-trim">
          {selected.custom ? t('endeavourInventory.customBadge') : endeavourItemSummary(fm)}
        </span>
      </div>
      {selected.custom && <p className="mt-2 text-xs text-fg-muted">{t('endeavourInventory.customNotice')}</p>}
      <dl className="mt-2 space-y-1 text-sm">
        {fm.cost && <Row label={t('endeavourInventory.detailCost')} value={fm.cost} />}
        {slots !== undefined && <Row label={t('endeavourInventory.detailSlots')} value={String(slots)} />}
        {fm.kind === 'equipment' && fm.stack_size !== undefined && fm.stack_size > 1 && (
          <Row label={t('endeavourInventory.detailStackSize')} value={String(fm.stack_size)} />
        )}
        {fm.kind === 'container' && fm.max_size && (
          <Row label={t('endeavourInventory.detailMaxSize')} value={t(`endeavourInventory.size.${fm.max_size}` as TranslationKey)} />
        )}
      </dl>
      {selected.item.body && <div className="mt-3 border-t border-trim/20 pt-2 text-sm text-fg-muted">{renderObsidianBody(selected.item.body)}</div>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="rpg-plate px-2 py-0.5 text-right font-medium text-fg">{value}</dd>
    </div>
  )
}
