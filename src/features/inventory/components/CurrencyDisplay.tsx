import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EditableNumber } from '../../../components/EditableNumber'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import { useVaultStore } from '../../../store/vaultStore'
import type { CharacterFrontmatter, Currency } from '../../../vault/types'

type Coin = keyof Currency

const DENOMINATIONS: Coin[] = ['gp', 'sp', 'cp']
const STEPS = [1, 5, 10]

/** Coin metals — fixed colours on purpose (gold, silver, copper), not theme tokens. */
const COIN_COLOR: Record<Coin, string> = {
  gp: '#f0c24b',
  sp: '#c4c8d0',
  cp: '#cd7f4f',
}

/** House rule: only gold, silver and copper — each step is 10:1. */
const EXCHANGE: Partial<Record<Coin, { lower: Coin; rate: number }>> = {
  gp: { lower: 'sp', rate: 10 },
  sp: { lower: 'cp', rate: 10 },
}

function CoinIcon({ coin, className = 'size-3' }: { coin: Coin; className?: string }) {
  return (
    <span
      aria-hidden
      className={`${className} shrink-0 rounded-full border border-black/30`}
      style={{ background: `radial-gradient(circle at 30% 30%, #fff9, ${COIN_COLOR[coin]} 65%)` }}
    />
  )
}

const roundButton =
  'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-trim/50 bg-surface-2 text-base font-bold text-fg-muted transition hover:border-trim hover:text-fg disabled:cursor-not-allowed disabled:opacity-35'
const chipButton =
  'rpg-plate min-w-9 cursor-pointer px-1.5 py-1 text-xs font-semibold text-fg-muted transition hover:text-fg disabled:cursor-not-allowed disabled:opacity-35'

export function CurrencyDisplay({
  currency,
  characterPath,
  writeTargets,
}: {
  currency?: Currency
  characterPath?: string
  writeTargets?: CharacterFrontmatter['_write']
}) {
  const t = useT()
  const canEdit = useVaultStore((s) => s.editPermission === 'granted')
  const setCurrency = useVaultStore((s) => s.setCurrency)
  const [openCoin, setOpenCoin] = useState<Coin | null>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const tileRefs = useRef<Partial<Record<Coin, HTMLButtonElement | null>>>({})
  const popoverRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const tile = openCoin ? tileRefs.current[openCoin] : null
    if (!tile) return
    const rect = tile.getBoundingClientRect()
    const width = 288
    setCoords({
      top: Math.max(8, rect.top - 8),
      left: Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8),
    })
  }, [openCoin])

  useEffect(() => {
    if (!openCoin) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (popoverRef.current?.contains(target)) return
      if (Object.values(tileRefs.current).some((el) => el?.contains(target))) return
      setOpenCoin(null)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenCoin(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openCoin])

  if (!currency) return null

  const label = (coin: Coin) => t(`currency.${coin}` as TranslationKey)
  const editable = () => canEdit && !!characterPath && !!(writeTargets?.currency_block || writeTargets?.currency)

  function commitChanges(changes: Partial<Currency>) {
    if (!characterPath) return
    const next: Currency = { ...currency, ...changes }
    for (const coin of Object.keys(changes) as Coin[]) next[coin] = Math.max(0, changes[coin] ?? 0)
    void setCurrency(characterPath, next)
  }
  const setCoin = (coin: Coin, next: number) => commitChanges({ [coin]: next })

  /** One combined write, so a change is never half-applied. */
  const exchange = (from: Coin, to: Coin, takeAmount: number, giveAmount: number) =>
    commitChanges({ [from]: (currency?.[from] ?? 0) - takeAmount, [to]: (currency?.[to] ?? 0) + giveAmount })

  function renderPopover(coin: Coin) {
    const value = currency?.[coin] ?? 0
    const ex = EXCHANGE[coin]
    const lowerValue = ex ? (currency?.[ex.lower] ?? 0) : 0
    const canExchange = !!ex && editable()
    return (
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={label(coin)}
        className="rpg-panel fixed z-50 w-72 -translate-y-full space-y-3 p-3"
        style={{ top: coords.top, left: coords.left }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.14em] text-trim">
            <CoinIcon coin={coin} className="size-4" />
            {label(coin)}
          </div>
          <button type="button" onClick={() => setOpenCoin(null)} aria-label={t('currency.close')} className="cursor-pointer px-1 text-fg-muted hover:text-fg">
            ×
          </button>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button type="button" className={roundButton} disabled={value <= 0} onClick={() => setCoin(coin, value - 1)} aria-label="−1">
            −
          </button>
          <EditableNumber
            key={value}
            value={value}
            onCommit={(next) => setCoin(coin, next)}
            className="rpg-plate font-num w-24 px-1 py-1 text-center text-3xl text-fg"
          />
          <button type="button" className={roundButton} onClick={() => setCoin(coin, value + 1)} aria-label="+1">
            +
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5">
          {[...STEPS].reverse().map((n) => (
            <button key={`-${n}`} type="button" className={chipButton} disabled={value <= 0} onClick={() => setCoin(coin, value - n)}>
              −{n}
            </button>
          ))}
          <span aria-hidden className="mx-1 h-4 w-px bg-trim/30" />
          {STEPS.map((n) => (
            <button key={`+${n}`} type="button" className={chipButton} onClick={() => setCoin(coin, value + n)}>
              +{n}
            </button>
          ))}
        </div>

        {ex && (
          <div className="space-y-1.5 border-t border-trim/25 pt-2.5">
            <div className="text-center font-display text-[0.65rem] font-bold uppercase tracking-[0.14em] text-fg-muted">
              {t('currency.exchange')}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className={`${chipButton} px-2.5`}
                disabled={!canExchange || value < 1}
                onClick={() => exchange(coin, ex.lower, 1, ex.rate)}
              >
                {t('currency.exchangeDown', { from: label(coin), to: label(ex.lower), rate: ex.rate })}
              </button>
              <button
                type="button"
                className={`${chipButton} px-2.5`}
                disabled={!canExchange || lowerValue < ex.rate}
                onClick={() => exchange(ex.lower, coin, ex.rate, 1)}
              >
                {t('currency.exchangeUp', { from: label(coin), to: label(ex.lower), rate: ex.rate })}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="grid w-full grid-cols-3 gap-2">
        {DENOMINATIONS.map((coin) => {
          const value = currency[coin] ?? 0
          const content = (
            <>
              <div className="flex items-center gap-1.5">
                <CoinIcon coin={coin} />
                <span className="font-num text-base text-fg">{value}</span>
              </div>
              <div className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted">{label(coin)}</div>
            </>
          )
          const base = 'rpg-plate flex flex-col items-center px-2 py-2'
          return editable() ? (
            <button
              key={coin}
              ref={(el) => {
                tileRefs.current[coin] = el
              }}
              type="button"
              onClick={() => setOpenCoin((cur) => (cur === coin ? null : coin))}
              aria-haspopup="dialog"
              aria-expanded={openCoin === coin}
              className={`${base} cursor-pointer transition hover:border-trim ${openCoin === coin ? 'border-trim ring-2 ring-trim/40' : ''}`}
            >
              {content}
            </button>
          ) : (
            <div key={coin} className={base}>
              {content}
            </div>
          )
        })}
      </div>
      {openCoin && editable() && createPortal(renderPopover(openCoin), document.body)}
    </>
  )
}
