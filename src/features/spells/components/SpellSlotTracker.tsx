import { useT } from '../../../i18n/I18nContext'
import { useVaultStore } from '../../../store/vaultStore'
import type { FieldWriteTarget, SpellcastingInfo } from '../../../vault/types'

/**
 * One full-width row per spell level (label, pips, remaining/max) rather than a grid of narrow
 * tiles — a grid column in this card's usual placement (a ~1/3-width sidebar) isn't wide enough for
 * 4+ pips on one line, so they used to wrap into a cramped, uneven little block per level.
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
  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted' && Boolean(characterPath)

  const levels = Object.entries(spellcasting.slots ?? {}).sort(([a], [b]) => Number(a) - Number(b))
  if (levels.length === 0) return null

  return (
    <div className="space-y-1.5">
      {levels.map(([level, { max, used }]) => {
        const remaining = max - used
        const target = writeTargets?.[level]
        return (
          <div key={level} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5">
            <span className="w-11 shrink-0 text-xs uppercase text-fg-muted">{t('spells.slotLevelLabel', { level })}</span>
            <div className="flex flex-1 flex-wrap gap-1">
              {Array.from({ length: max }, (_, i) => {
                const filled = i < remaining
                const pipClass = `h-2.5 w-2.5 shrink-0 rounded-full ${filled ? 'bg-primary' : 'border border-border bg-transparent'}`
                if (!canEdit || !target) return <span key={i} className={pipClass} />
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={t('a11y.spellSlot', { level, n: i + 1 })}
                    onClick={() => {
                      const nextRemaining = remaining === i + 1 ? i : i + 1
                      const nextUsed = max - nextRemaining
                      void updateCharacterField(characterPath!, target, nextUsed, (c) => {
                        if (!c.spellcasting?.slots?.[level]) return c
                        return { ...c, spellcasting: { ...c.spellcasting, slots: { ...c.spellcasting.slots, [level]: { max, used: nextUsed } } } }
                      })
                    }}
                    className={`${pipClass} cursor-pointer transition hover:opacity-70`}
                  />
                )
              })}
            </div>
            <span className="w-10 shrink-0 text-right text-xs text-fg-muted">
              {remaining}/{max}
            </span>
          </div>
        )
      })}
    </div>
  )
}
