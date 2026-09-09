import type { Currency } from '../../../vault/types'

const DENOMINATIONS: { key: keyof Currency; label: string }[] = [
  { key: 'pp', label: 'PP' },
  { key: 'gp', label: 'GP' },
  { key: 'ep', label: 'EP' },
  { key: 'sp', label: 'SP' },
  { key: 'cp', label: 'CP' },
]

export function CurrencyDisplay({ currency }: { currency?: Currency }) {
  if (!currency) return null

  return (
    <div className="grid grid-cols-5 gap-2">
      {DENOMINATIONS.map(({ key, label }) => (
        <div key={key} className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-center">
          <div className="text-base font-bold text-fg">{currency[key] ?? 0}</div>
          <div className="text-xs uppercase text-fg-muted">{label}</div>
        </div>
      ))}
    </div>
  )
}
