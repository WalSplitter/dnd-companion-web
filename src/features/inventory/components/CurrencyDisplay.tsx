import { useT, type TranslationKey } from '../../../i18n/I18nContext'
import type { Currency } from '../../../vault/types'

const DENOMINATIONS: (keyof Currency)[] = ['pp', 'gp', 'ep', 'sp', 'cp']

export function CurrencyDisplay({ currency }: { currency?: Currency }) {
  const t = useT()
  if (!currency) return null

  return (
    <div className="grid grid-cols-5 gap-2">
      {DENOMINATIONS.map((key) => (
        <div key={key} className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-center">
          <div className="text-base font-bold text-fg">{currency[key] ?? 0}</div>
          <div className="text-xs uppercase text-fg-muted">{t(`currency.${key}` as TranslationKey)}</div>
        </div>
      ))}
    </div>
  )
}
