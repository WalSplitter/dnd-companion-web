import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { AMBIENT_ART, type AmbientArtKind } from './ambientArt'
import { useThemeStore, type ThemeName } from './themeStore'

interface AmbientScene {
  /** Plain `.ambient-particle` spans (souls, snow ...), drawn by the theme's CSS alone. */
  particles?: number
  /** Drawn figures scattered over the screen (skulls, eyes, hearts ...), each moving on its own. */
  sprites?: { kind: AmbientArtKind; count: number }[]
  /** Figures crossing the screen now and then, one at a time, `gap` seconds apart (min, max). */
  flybys?: { kinds: AmbientArtKind[]; gap: [number, number] }
}

/** What each topic theme puts on screen; the look and motion of each piece lives in `topics.css`. */
const SCENES: Partial<Record<ThemeName, AmbientScene>> = {
  arkanist: { particles: 24, sprites: [{ kind: 'rune', count: 5 }] },
  berserker: { particles: 34 },
  gauner: { particles: 7, sprites: [{ kind: 'eyes', count: 4 }] },
  kleriker: { particles: 18, flybys: { kinds: ['wisp'], gap: [16, 40] } },
  moench: { particles: 14, sprites: [{ kind: 'gust', count: 3 }] },
  naturalist: { particles: 40, sprites: [{ kind: 'bolt', count: 2 }] },
  paladin: { particles: 22, sprites: [{ kind: 'glint', count: 7 }] },
  taktiker: {
    sprites: [
      { kind: 'marker', count: 6 },
      { kind: 'ping', count: 3 },
    ],
  },
  waldlaeufer: { particles: 20, flybys: { kinds: ['hawk'], gap: [18, 45] } },
  fluchwirker: {
    particles: 22,
    sprites: [{ kind: 'sigil', count: 5 }],
    flybys: { kinds: ['horde'], gap: [16, 40] },
  },
  pixelquest: {
    particles: 16,
    sprites: [{ kind: 'pixel-cloud', count: 5 }],
    flybys: { kinds: ['pixel-dragon', 'pixel-knight'], gap: [15, 40] },
  },
  dragon: {
    particles: 26,
    sprites: [{ kind: 'glint', count: 9 }],
  },
  unicorn: {
    particles: 22,
    sprites: [
      { kind: 'heart', count: 12 },
      { kind: 'cloud', count: 4 },
    ],
    flybys: { kinds: ['unicorn'], gap: [12, 30] },
  },
  deepsea: {
    particles: 26,
    sprites: [{ kind: 'jellyfish', count: 4 }],
    flybys: { kinds: ['fish-school'], gap: [12, 32] },
  },
  astral: {
    particles: 40,
    sprites: [{ kind: 'shooting-star', count: 3 }],
    flybys: { kinds: ['comet'], gap: [20, 50] },
  },
  halloween: { particles: 6 },
  christmas: { particles: 34, flybys: { kinds: ['santa'], gap: [25, 70] } },
  summer: { particles: 14 },
  spring: { particles: 18 },
  winter: {
    particles: 26,
    sprites: [{ kind: 'glint', count: 6 }],
    flybys: { kinds: ['owl'], gap: [20, 50] },
  },
}

/** Seconds until the first flyby after switching to a theme, so it shows up soon. */
const FIRST_FLYBY: [number, number] = [4, 12]

/** Touch devices (phones, tablets) without a hovering pointer: weaker GPUs that also scroll the page
 * over the scene, so they get half the particles. */
const TOUCH_QUERY = '(hover: none)'

/** Absent in jsdom (tests), so treated as "not touch" there. */
function touchQuery(): MediaQueryList | undefined {
  return typeof window.matchMedia === 'function' ? window.matchMedia(TOUCH_QUERY) : undefined
}

function subscribeTouch(onChange: () => void) {
  const query = touchQuery()
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

function useIsTouch(): boolean {
  return useSyncExternalStore(
    subscribeTouch,
    () => touchQuery()?.matches ?? false,
    () => false,
  )
}

/** Deterministic 0..1 noise, so particles keep their spots across re-renders. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function randomVars(seed: number): CSSProperties {
  return {
    '--r1': noise(seed).toFixed(3),
    '--r2': noise(seed + 100).toFixed(3),
    '--r3': noise(seed + 200).toFixed(3),
  } as CSSProperties
}

interface Flight {
  id: number
  kind: AmbientArtKind
  y: number
  rtl: boolean
}

/** Sends one figure across the screen at a time, then waits a random gap before the next. */
function Flybys({ kinds, gap }: NonNullable<AmbientScene['flybys']>) {
  const [flight, setFlight] = useState<Flight | null>(null)
  const round = useRef(0)

  useEffect(() => {
    if (flight) return
    const [min, max] = round.current === 0 ? FIRST_FLYBY : gap
    const timer = window.setTimeout(
      () => {
        round.current += 1
        setFlight({
          id: round.current,
          kind: kinds[Math.floor(Math.random() * kinds.length)],
          y: Math.random(),
          rtl: Math.random() < 0.5,
        })
      },
      (min + Math.random() * (max - min)) * 1000,
    )
    return () => window.clearTimeout(timer)
  }, [flight, kinds, gap])

  if (!flight) return null
  return (
    <div className="ambient-flybys" aria-hidden>
      <div
        key={flight.id}
        className={`ambient-flyby ambient-${flight.kind}${flight.rtl ? ' is-rtl' : ''}`}
        style={
          {
            '--fy': flight.y.toFixed(3),
            '--dir': flight.rtl ? -1 : 1,
          } as CSSProperties
        }
        // The figure's own limbs animate forever; only the crossing itself ends.
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setFlight(null)
        }}
      >
        <div className="ambient-flyby-art">{AMBIENT_ART[flight.kind]}</div>
      </div>
    </div>
  )
}

/**
 * Fixed layer behind the page holding a topic theme's ambient scene (souls, bats, snow, skulls,
 * a passing sleigh ...). Each particle and sprite only gets three random numbers (`--r1..--r3`);
 * the theme's CSS turns them into position, size, speed and delay. Hidden for users who prefer
 * reduced motion.
 */
export function AmbientLayer() {
  const theme = useThemeStore((s) => s.theme)
  const effects = useThemeStore((s) => s.effects)
  const touch = useIsTouch()
  const scene = effects ? SCENES[theme] : undefined
  if (!scene) return null
  // Keeping the first half preserves each theme's `nth-child` mix of particle kinds.
  const particles = Math.ceil((scene.particles ?? 0) / (touch ? 2 : 1))

  return (
    <>
      <div className="ambient-layer" aria-hidden>
        {Array.from({ length: particles }, (_, i) => (
          <span key={`${theme}-${i}`} className="ambient-particle" style={randomVars(i + 1)} />
        ))}
        {scene.sprites?.map(({ kind, count }, k) =>
          Array.from({ length: count }, (_, i) => (
            <span
              key={`${theme}-${kind}-${i}`}
              className={`ambient-sprite ambient-${kind}`}
              style={
                {
                  ...randomVars(1000 * (k + 1) + i + 1),
                  '--i': i,
                  '--n': count,
                } as CSSProperties
              }
            >
              {AMBIENT_ART[kind]}
            </span>
          )),
        )}
      </div>
      {scene.flybys && <Flybys key={theme} {...scene.flybys} />}
    </>
  )
}
