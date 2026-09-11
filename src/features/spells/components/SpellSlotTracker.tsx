import { useVaultStore } from '../../../store/vaultStore'
import type { FieldWriteTarget, SpellcastingInfo } from '../../../vault/types'

export function SpellSlotTracker({
  spellcasting,
  characterPath,
  writeTargets,
}: {
  spellcasting: SpellcastingInfo
  characterPath?: string
  writeTargets?: Record<string, FieldWriteTarget>
}) {
  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted' && Boolean(characterPath)

  const levels = Object.entries(spellcasting.slots ?? {}).sort(([a], [b]) => Number(a) - Number(b))
  if (levels.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9">
      {levels.map(([level, { max, used }]) => {
        const remaining = max - used
        const target = writeTargets?.[level]
        return (
          <div key={level} className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-center">
            <div className="text-xs uppercase text-fg-muted">Lvl {level}</div>
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {Array.from({ length: max }, (_, i) => {
                const filled = i < remaining
                const pipClass = `h-2.5 w-2.5 rounded-full ${filled ? 'bg-primary' : 'border border-border bg-transparent'}`
                if (!canEdit || !target) return <span key={i} className={pipClass} />
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Level ${level} slot ${i + 1}`}
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
            <div className="mt-1 text-xs text-fg-muted">
              {remaining}/{max}
            </div>
          </div>
        )
      })}
    </div>
  )
}
