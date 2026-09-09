import type { SpellcastingInfo } from '../../../vault/types'

export function SpellSlotTracker({ spellcasting }: { spellcasting: SpellcastingInfo }) {
  const levels = Object.entries(spellcasting.slots ?? {}).sort(([a], [b]) => Number(a) - Number(b))
  if (levels.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9">
      {levels.map(([level, { max, used }]) => {
        const remaining = max - used
        return (
          <div key={level} className="rounded-lg border border-border bg-surface-2 px-2 py-2 text-center">
            <div className="text-xs uppercase text-fg-muted">Lvl {level}</div>
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {Array.from({ length: max }, (_, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full ${i < remaining ? 'bg-primary' : 'border border-border bg-transparent'}`}
                />
              ))}
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
