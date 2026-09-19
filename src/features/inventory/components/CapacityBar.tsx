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
  const pct = capacity > 0 ? Math.min(100, (used / capacity) * 100) : 0

  return (
    <div className={`rpg-plate flex h-full flex-col justify-center px-3 py-2 text-center ${over ? '!border-danger !bg-danger/10' : ''}`}>
      <div className={`font-num text-lg leading-tight ${over ? 'text-danger' : 'text-fg'}`}>{t('endeavourInventory.capacityValue', { used, capacity })}</div>
      <div className="my-1 h-1.5 overflow-hidden rounded-full border border-trim/30 bg-black/35">
        <div className={`h-full rounded-full bg-linear-to-r ${over ? 'from-danger/60 to-danger' : 'from-trim/60 to-trim'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted">{t('endeavourInventory.capacityLabel')}</div>
    </div>
  )
}
