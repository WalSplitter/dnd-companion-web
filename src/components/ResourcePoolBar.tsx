import type { ResourcePool } from '../vault/types'

/** A slim labeled progress bar for a per-class resource pool (e.g. sorcery points) — scales cleanly
 * to any max, unlike a pip row, which gets unwieldy once a pool goes past a handful of points. */
export function ResourcePoolBar({ pool }: { pool: ResourcePool }) {
  const pct = pool.max > 0 ? Math.max(0, Math.min(100, (pool.current / pool.max) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="uppercase text-fg-muted">{pool.name}</span>
        <span className="font-semibold text-fg">
          {pool.current}/{pool.max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
