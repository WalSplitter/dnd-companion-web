import { useId, useState } from 'react'
import { useT } from '../../../i18n/useI18n'
import { useCanEdit, useVaultStore } from '../../../store/vaultStore'
import type { FieldWriteTarget, SpellcastingInfo } from '../../../vault/types'

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

/** Crystal outline and its facet lines, on a 24×24 grid. */
const GEM = 'M12 1.5 20.5 7.5v9L12 22.5 3.5 16.5v-9Z'
const FACETS = 'M3.5 7.5 12 11l8.5-3.5M12 11v11.5M12 1.5 8 7.5 12 11l4-3.5-4-6'
const CRACK = 'M12.6 3.5 10.6 9.2l3 2.4-2.2 4.1 1.4 4.4'

/** The accent gradient a charged crystal is filled with; render once, then pass `id` to each `SlotCrystal`. */
export function CrystalGradient({ id }: { id: string }) {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--color-accent) 35%, white)' }} />
          <stop offset="45%" style={{ stopColor: 'var(--color-accent)' }} />
          <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--color-accent) 55%, black)' }} />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** One slot as a crystal: a glowing gem when charged, a cracked empty setting when spent. */
export function SlotCrystal({ charged, gradientId }: { charged: boolean; gradientId: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path className="spell-slot-socket" d={GEM} />
      {charged ? (
        <>
          <path d={GEM} fill={`url(#${CSS.escape(gradientId)})`} className="spell-slot-crystal" />
          <path d={FACETS} className="spell-slot-facets" />
          <path d="M8.2 5.2 6 6.7" className="spell-slot-glint" />
        </>
      ) : (
        <path d={CRACK} className="spell-slot-crack" />
      )}
    </svg>
  )
}

/**
 * One row per spell grade: a numeral medallion, then one arcane crystal per slot. A charged slot is
 * a glowing gem; a spent one stays visible as a cracked, empty setting (and glimmers on hover when
 * editable), so it's obvious which slots can be recharged. Clicking works like before: the n-th
 * crystal sets n slots remaining, clicking the last charged one spends it.
 */
export function SpellSlotTracker({
  spellcasting,
  characterPath,
  writeTargets,
}: {
  spellcasting: SpellcastingInfo
  characterPath?: string
  writeTargets?: Record<string, FieldWriteTarget>
}) {
  const t = useT()
  const gradientId = useId()
  const canEdit = useCanEdit() && Boolean(characterPath)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  // The last user change, so only the crystals it touched play their ignite/shatter animation.
  const [change, setChange] = useState<{ level: string; from: number; to: number; id: number }>()

  const levels = Object.entries(spellcasting.slots ?? {}).sort(([a], [b]) => Number(a) - Number(b))
  if (levels.length === 0) return null

  return (
    <div className="space-y-2">
      <CrystalGradient id={gradientId} />
      {levels.map(([level, { max, used }]) => {
        const remaining = max - used
        const target = writeTargets?.[level]
        const editable = canEdit && Boolean(target)
        const levelLabel = t('spells.slotLevelLabel', { level })
        return (
          <div key={level} className={`spell-slot-row ${remaining === 0 ? 'is-depleted' : ''}`}>
            <span className="spell-slot-grade" title={levelLabel} aria-label={levelLabel}>
              {ROMAN[Number(level)] ?? level}
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-1">
              {Array.from({ length: max }, (_, i) => {
                const charged = i < remaining
                const touched = change?.level === level && i >= Math.min(change.from, change.to) && i < Math.max(change.from, change.to)
                const className = `spell-slot-gem ${charged ? 'is-charged' : 'is-spent'} ${touched ? (charged ? 'is-igniting' : 'is-shattering') : ''}`
                const gem = <SlotCrystal charged={charged} gradientId={gradientId} />
                const key = touched ? `${i}-${change.id}` : i
                if (!editable) return <span key={key} className={className}>{gem}</span>
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={t('a11y.spellSlot', { level, n: i + 1 })}
                    aria-pressed={charged}
                    onClick={() => {
                      const nextRemaining = remaining === i + 1 ? i : i + 1
                      const nextUsed = max - nextRemaining
                      setChange({ level, from: remaining, to: nextRemaining, id: Date.now() })
                      void updateCharacterField(characterPath!, target, nextUsed, (c) => {
                        if (!c.spellcasting?.slots?.[level]) return c
                        return { ...c, spellcasting: { ...c.spellcasting, slots: { ...c.spellcasting.slots, [level]: { max, used: nextUsed } } } }
                      })
                    }}
                    className={`${className} is-editable`}
                  >
                    {gem}
                  </button>
                )
              })}
            </div>
            <span className="spell-slot-count font-num">
              <span className={remaining === 0 ? 'text-fg-muted' : 'text-accent'}>{remaining}</span>
              <span className="text-fg-muted">/{max}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
