import { useT, type TranslationKey } from '../../../i18n/I18nContext'
import type { Currency } from '../../../vault/types'

const DENOMINATIONS: (keyof Currency)[] = ['pp', 'gp', 'ep', 'sp', 'cp']

/** Coin metals — fixed colours on purpose (platinum, gold, electrum, silver, copper), not theme tokens. */
const COIN_COLOR: Record<keyof Currency, string> = {
  pp: '#d5dde8',
  gp: '#f0c24b',
  ep: '#b9c98a',
  sp: '#c4c8d0',
  cp: '#cd7f4f',
}

export function CurrencyDisplay({ currency }: { currency?: Currency }) {
  const t = useT()
  if (!currency) return null

  return (
    <div className="grid w-full grid-cols-5 gap-2">
      {DENOMINATIONS.map((key) => (
        <div key={key} className="rpg-plate flex flex-col items-center px-2 py-2">
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 rounded-full border border-black/30"
              style={{ background: `radial-gradient(circle at 30% 30%, #fff9, ${COIN_COLOR[key]} 65%)` }}
            />
            <span className="font-num text-base text-fg">{currency[key] ?? 0}</span>
          </div>
          <div className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted">{t(`currency.${key}` as TranslationKey)}</div>
        </div>
      ))}
    </div>
  )
}
