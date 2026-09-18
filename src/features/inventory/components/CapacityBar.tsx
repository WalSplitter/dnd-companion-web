import { useT } from '../../../i18n/I18nContext'

/**
 * Replaces the old lb-weight display for the new slot-based system: the real example items carry no
 * weight field at all, and `Gepäck.md` only ever measures load in slots. Shows "used / capacity" for
 * the main backpack (the container that actually gates what fits — see the feature's plan doc for
 * why the separate STR-modifier "Belastet" threshold isn't implemented yet).
 */
export function CapacityBar({ used, capacity }: { used: number; capacity: number }) {
  const t = useT()
  const over = used > capacity

  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${over ? 'border-danger bg-danger/10' : 'border-border bg-surface-2'}`}>
      <div className={`text-lg font-bold ${over ? 'text-danger' : 'text-fg'}`}>{t('endeavourInventory.capacityValue', { used, capacity })}</div>
      <div className="text-xs uppercase text-fg-muted">{t('endeavourInventory.capacityLabel')}</div>
    </div>
  )
}
