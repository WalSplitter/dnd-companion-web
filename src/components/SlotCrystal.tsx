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
