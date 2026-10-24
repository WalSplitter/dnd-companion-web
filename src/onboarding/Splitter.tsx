import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import cheerArt from './art/splitter-cheer.webp'
import dozeArt from './art/splitter-doze.webp'
import happyArt from './art/splitter-happy.webp'
import talkArt from './art/splitter-talk.webp'

export type SplitterMood = 'idle' | 'talk' | 'cheer' | 'doze'

/**
 * One painted portrait per mood (`art/splitter-*.webp`, all on the same canvas, so they line up):
 * attentive while talking, smiling when it offers a quest, delighted when one is done, asleep.
 */
const ART: Record<SplitterMood, string> = { talk: talkArt, idle: happyArt, cheer: cheerArt, doze: dozeArt }

/**
 * The point of the artwork a portrait centres on, in percent of its width and height: the face, just
 * below the eyes. Swapping the artwork means measuring this again.
 */
const FACE = { x: 50, y: 40 }

/** The crystal shard Splitter is named after, in the theme's colour. */
export function Shard({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 46" className={`splitter-shard ${className}`} aria-hidden>
      <path className="shard-body" d="M17 1 31 15 24 45 10 45 3 15Z" />
      <path className="shard-facet" d="M17 1 17 45M3 15 31 15" />
      <path className="shard-glint" d="M8 16 15 6" />
    </svg>
  )
}

/**
 * Splitter's portrait, the way RPGs show a companion: the painted husky (named after WalSplitter, with
 * the odd eyes of his husky — one amber, one ice blue) in a gilded frame, on a dark ground lit in the theme's
 * colour, behind a faint rune ring and a vignette. `round` is the medallion (welcome dialog, companion),
 * `card` the framed portrait beside a dialogue, with a name plate.
 * Each mood has its own painting; on top, talk breathes, cheer hops in a burst of sparks, doze dims
 * with drifting z's.
 */
export function SplitterPortrait({
  shape,
  size,
  mood = 'idle',
  name,
  className = '',
}: {
  shape: 'round' | 'card'
  /** Width in pixels; without it the surrounding CSS sets `--portrait-size` (e.g. smaller on phones). */
  size?: number
  mood?: SplitterMood
  /** Name plate under a `card` portrait. */
  name?: string
  className?: string
}) {
  return (
    <span
      className={`splitter-portrait is-${shape} is-${mood} ${className}`}
      style={{ ...(size ? { '--portrait-size': `${size}px` } : {}), '--face-x': `${FACE.x}%`, '--face-y': `${FACE.y}%` } as CSSProperties}
      aria-hidden
    >
      <span className="splitter-portrait-frame">
        <img src={ART[mood]} alt="" draggable={false} className="splitter-portrait-art" />
      </span>
      {shape === 'round' && <Shard className="is-clasp" />}
      {name && <span className="splitter-portrait-name">{name}</span>}
      {mood === 'cheer' && (
        <span className="splitter-burst">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} style={{ '--a': `${i * 36}deg` } as CSSProperties} />
          ))}
        </span>
      )}
      {mood === 'doze' && (
        <span className="splitter-zzz">
          <span>z</span>
          <span>z</span>
          <span>Z</span>
        </span>
      )}
    </span>
  )
}

const FLIGHT_MS = 900
const TRAIL_EMBERS = 12
const MIN_FLIGHT = 80

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A point on the arc from `a` to `b` that bulges `lift` px upwards at the middle (quadratic Bézier). */
function arcPoint(a: { x: number; y: number }, b: { x: number; y: number }, lift: number, t: number) {
  const cx = (a.x + b.x) / 2
  const cy = Math.min(a.y, b.y) - lift
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }
}

/**
 * Splitter's light during a tour: its crystal shard, glowing in the theme's colour, hovering at the lit
 * element. It sits with its centre at (`x`, `y`) in viewport pixels; when that changes it flies there
 * on an arc and leaves a short trail of embers (or just fades over, with reduced motion).
 */
export function SplitterWisp({ x, y }: { x: number; y: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const from = useRef<{ x: number; y: number } | null>(null)
  const [trail, setTrail] = useState<{ id: number; points: { x: number; y: number }[] } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const start = from.current
    from.current = { x, y }
    if (!el || !start || typeof el.animate !== 'function') return
    const to = { x, y }
    const distance = Math.hypot(to.x - start.x, to.y - start.y)
    // Small moves (the page scrolling under a target) are simply followed; only a new place is flown to.
    if (distance < MIN_FLIGHT) return
    if (reducedMotion()) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 })
      return
    }
    const lift = Math.min(160, 40 + distance * 0.25)
    const frames = Array.from({ length: 9 }, (_, i) => {
      const p = arcPoint(start, to, lift, i / 8)
      return { transform: `translate(${p.x - x}px, ${p.y - y}px)` }
    })
    el.animate(frames, { duration: FLIGHT_MS, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' })
    setTrail({ id: Date.now(), points: Array.from({ length: TRAIL_EMBERS }, (_, i) => arcPoint(start, to, lift, (i + 0.5) / TRAIL_EMBERS)) })
  }, [x, y])

  useEffect(() => {
    if (!trail) return
    const timer = window.setTimeout(() => setTrail(null), FLIGHT_MS + 700)
    return () => window.clearTimeout(timer)
  }, [trail])

  return createPortal(
    <>
      {trail && (
        <div className="splitter-trail" aria-hidden key={trail.id}>
          {trail.points.map((p, i) => (
            <span key={i} className="splitter-ember" style={{ left: p.x, top: p.y, animationDelay: `${(i / TRAIL_EMBERS) * FLIGHT_MS}ms` }} />
          ))}
        </div>
      )}
      <div ref={ref} className="splitter-wisp" style={{ left: x, top: y }} aria-hidden>
        <span className="splitter-wisp-halo" />
        <Shard />
        <span className="splitter-spark" style={{ '--k': 0, '--dx': '-7px' } as CSSProperties} />
        <span className="splitter-spark" style={{ '--k': 1, '--dx': '6px' } as CSSProperties} />
        <span className="splitter-spark" style={{ '--k': 2, '--dx': '-2px' } as CSSProperties} />
      </div>
    </>,
    document.body,
  )
}
