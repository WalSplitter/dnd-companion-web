import { endeavourItemSummary, resolveSlotCost, type EndeavourItemFrontmatter } from '../../../vault/adapters/endeavourItem'
import { EditableNumber } from '../../../components/EditableNumber'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import { renderObsidianBody } from '../../../components/obsidian/renderObsidian'
import type { VaultFile } from '../../../vault/types'
import type { EquippedRef } from '../equipment'

export interface SelectedGridItem {
  /** Selection identity — a vault item's wikilink, or a temporary item's `custom:` key (see `entryKey`). */
  key: string
  item: VaultFile<EndeavourItemFrontmatter> | undefined
  /** True for a player-created temporary item that has no vault page (yet). */
  custom?: boolean
  /** Which placed tile this is (container + its index in that container's `items` list) — set only
   * when the selection came from a placed tile, not a search result. Lets the panel look up and
   * adjust that specific tile's charge count, independent of any other stack of the same item. */
  containerIndex?: number
  linkIndex?: number
  /** Set when the selection is an equipped item on the loadout rather than an inventory tile. */
  equipped?: EquippedRef
}

/** One stat an equip would change, shown before committing: `RK 0 → 2`. */
export interface EquipPreviewLine {
  label: string
  from: string
  to: string
  /** Positive = better, negative = worse, 0 = neutral (colors the arrow). */
  change: number
}

/** The equip/unequip button under the details, with what equipping would change. */
export interface EquipAction {
  kind: 'equip' | 'unequip'
  label: string
  onClick: () => void
  preview?: EquipPreviewLine[]
  /** A side effect worth saying up front, e.g. the old armor going back into the pack. */
  note?: string
}

/** Shows the currently selected item's details — selection can come from clicking a placed tile
 * (`ContainerGrid`) or a search result (`ItemSearchPanel`), both feeding the same shape up into
 * `EndeavourInventoryGrid`. `charges`/`onChangeCharges` are set only for a placed, charge-tracking
 * stack (see `EndeavourStackEntry`) — a search-result preview just shows the item's static `stack_size`. */
export function ItemDetailPanel({
  selected,
  charges,
  onChangeCharges,
  equipAction,
}: {
  selected: SelectedGridItem | null
  charges?: number
  onChangeCharges?: (next: number) => void
  equipAction?: EquipAction
}) {
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
          {selected.custom ? t('endeavourInventory.customBadge') : endeavourItemSummary(fm, t)}
        </span>
        {selected.equipped && (
          <span className="rounded-sm bg-success/15 px-1.5 py-px text-[0.65rem] font-medium uppercase tracking-wider text-success">{t('equipment.equippedBadge')}</span>
        )}
      </div>
      {selected.custom && <p className="mt-2 text-xs text-fg-muted">{t('endeavourInventory.customNotice')}</p>}
      <dl className="mt-2 space-y-1 text-sm">
        {fm.cost && <Row label={t('endeavourInventory.detailCost')} value={fm.cost} />}
        {slots !== undefined && <Row label={t('endeavourInventory.detailSlots')} value={String(slots)} />}
        {fm.stack_size !== undefined && fm.stack_size > 1 && (
          charges !== undefined ? (
            onChangeCharges ? (
              <ChargesRow label={t('endeavourInventory.detailCharges')} charges={charges} max={fm.stack_size} onChange={onChangeCharges} />
            ) : (
              <Row label={t('endeavourInventory.detailCharges')} value={`${charges} / ${fm.stack_size}`} />
            )
          ) : (
            <Row label={t('endeavourInventory.detailStackSize')} value={String(fm.stack_size)} />
          )
        )}
        {fm.kind === 'container' && fm.max_size && (
          <Row label={t('endeavourInventory.detailMaxSize')} value={t(`endeavourInventory.size.${fm.max_size}` as TranslationKey)} />
        )}
      </dl>
      {equipAction && <EquipActionBlock action={equipAction} />}
      {selected.item.body && <div className="mt-3 border-t border-trim/20 pt-2 text-sm text-fg-muted">{renderObsidianBody(selected.item.body)}</div>}
    </div>
  )
}

function EquipActionBlock({ action }: { action: EquipAction }) {
  const t = useT()
  return (
    <div className="mt-3 rounded-md border border-trim/30 bg-trim/5 p-2.5">
      {action.preview && action.preview.length > 0 && (
        <>
          <div className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-trim">{t('equipment.preview')}</div>
          <dl className="mb-2 space-y-1 text-sm">
            {action.preview.map((line) => (
              <div key={line.label} className="flex items-center justify-between gap-3">
                <dt className="text-fg-muted">{line.label}</dt>
                <dd className="flex items-center gap-1.5 font-num">
                  {line.from !== line.to && <span className="text-fg-muted line-through decoration-fg-muted/50">{line.from}</span>}
                  {line.from !== line.to && (
                    <span aria-hidden className={line.change > 0 ? 'text-success' : line.change < 0 ? 'text-danger' : 'text-fg-muted'}>
                      {line.change > 0 ? '▲' : line.change < 0 ? '▼' : '→'}
                    </span>
                  )}
                  <span className={line.change > 0 ? 'text-success' : line.change < 0 ? 'text-danger' : 'text-fg'}>{line.to}</span>
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {action.note && <p className="mb-2 text-xs italic text-fg-muted">{action.note}</p>}
      <button type="button" onClick={action.onClick} className="rpg-button flex w-full items-center justify-center gap-2">
        {action.label}
      </button>
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

/** Remaining-uses stepper for a placed stack of a consumable item (`Stapelgroesse` — e.g. a torch
 * usable 4 times): +/- buttons for the common single-use case, plus a click-to-type `EditableNumber`
 * for jumping straight to a value (the DM restocking a stack, or correcting a misclick). */
function ChargesRow({ label, charges, max, onChange }: { label: string; charges: number; max: number; onChange: (next: number) => void }) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={charges <= 0}
          aria-label={t('endeavourInventory.chargesDecreaseAria')}
          onClick={() => onChange(charges - 1)}
          className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-trim/40 bg-surface-2 text-xs font-bold text-fg-muted transition hover:border-trim hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <EditableNumber
          key={charges}
          value={charges}
          min={0}
          max={max}
          onCommit={onChange}
          className="rpg-plate w-9 px-1 py-0.5 text-center font-medium text-fg"
        />
        <span className="text-fg-muted">/ {max}</span>
        <button
          type="button"
          disabled={charges >= max}
          aria-label={t('endeavourInventory.chargesIncreaseAria')}
          onClick={() => onChange(charges + 1)}
          className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-trim/40 bg-surface-2 text-xs font-bold text-fg-muted transition hover:border-trim hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </dd>
    </div>
  )
}
