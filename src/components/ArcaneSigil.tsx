import { useId } from 'react'

const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'

/** Points of an `n`-pointed star polygon (every `step`-th vertex of a regular n-gon) around the centre. */
function starPoints(n: number, step: number, r: number): string {
  return Array.from({ length: n }, (_, i) => {
    const a = ((i * step * 360) / n - 90) * (Math.PI / 180)
    return `${(100 + r * Math.cos(a)).toFixed(2)},${(100 + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

/**
 * The app's emblem: a d20 inside counter-rotating rune circles. Drawn in the theme's trim colour, so
 * every theme gets a matching one; the motion lives in `index.css` (`.sigil-*`) and stops for users
 * who prefer reduced motion.
 */
export function ArcaneSigil({ className = '' }: { className?: string }) {
  const id = useId()
  const runePath = `${id}-runes`
  const glow = `${id}-glow`

  return (
    <svg viewBox="0 0 200 200" className={`arcane-sigil ${className}`} aria-hidden>
      <defs>
        <path id={runePath} d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0" />
        <radialGradient id={glow}>
          <stop offset="0%" stopColor="var(--color-trim)" stopOpacity="0.45" />
          <stop offset="60%" stopColor="var(--color-trim)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--color-trim)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="98" fill={`url(#${glow})`} className="sigil-pulse" />

      <g className="sigil-spin" fill="none" stroke="var(--color-trim)">
        <circle cx="100" cy="100" r="92" strokeOpacity="0.55" strokeWidth="0.8" />
        <circle cx="100" cy="100" r="74" strokeOpacity="0.4" strokeWidth="0.6" />
        <text fill="var(--color-trim)" stroke="none" fontSize="11" letterSpacing="3.2" opacity="0.8">
          <textPath href={`#${runePath}`}>
            {RUNES}
            {RUNES.slice(0, 5)}
          </textPath>
        </text>
      </g>

      <g className="sigil-spin-reverse" fill="none" stroke="var(--color-trim)">
        <circle cx="100" cy="100" r="66" strokeOpacity="0.5" strokeWidth="0.8" strokeDasharray="2 5" />
        <polygon points={starPoints(8, 3, 64)} strokeOpacity="0.35" strokeWidth="0.7" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = ((i * 45 - 90) * Math.PI) / 180
          return <circle key={i} cx={100 + 66 * Math.cos(a)} cy={100 + 66 * Math.sin(a)} r="2.2" fill="var(--color-trim)" stroke="none" />
        })}
      </g>

      {/* d20 */}
      <g className="sigil-die" fill="none" stroke="var(--color-trim)" strokeLinejoin="round">
        <polygon points="100,62 133,81 133,119 100,138 67,119 67,81" strokeWidth="2.2" fill="color-mix(in srgb, var(--color-trim) 10%, transparent)" />
        <polygon points="100,78 119,111 81,111" strokeWidth="1.6" />
        <path
          d="M100,62 L100,78 M133,81 L119,111 M133,81 L100,78 M67,81 L100,78 M67,81 L81,111 M133,119 L119,111 M67,119 L81,111 M100,138 L119,111 M100,138 L81,111"
          strokeWidth="1.1"
          strokeOpacity="0.75"
        />
        <text x="100" y="104" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--color-trim)" stroke="none" fontFamily="var(--font-numeric)">
          20
        </text>
      </g>
    </svg>
  )
}
