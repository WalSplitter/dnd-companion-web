import { useMemo, type CSSProperties } from 'react'

const EMBER_COUNT = 22

/** Sparks drifting up behind the page. Positions are derived from the index, so they're stable across renders. */
export function Embers() {
  const embers = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, (_, i) => {
        const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
        return {
          left: `${(r(1) * 100).toFixed(1)}%`,
          '--size': `${(2 + r(2) * 4).toFixed(1)}px`,
          '--drift': `${((r(3) - 0.5) * 120).toFixed(0)}px`,
          animationDuration: `${(9 + r(4) * 10).toFixed(1)}s`,
          animationDelay: `${(-r(5) * 18).toFixed(1)}s`,
        } as CSSProperties
      }),
    [],
  )
  return (
    <div className="start-embers" aria-hidden>
      {embers.map((style, i) => (
        <span key={i} className="start-ember" style={style} />
      ))}
    </div>
  )
}
