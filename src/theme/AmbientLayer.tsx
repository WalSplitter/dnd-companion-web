import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
  necromancer: {
    particles: 18,
    sprites: [
      { kind: 'glyph', count: 7 },
      { kind: 'scarab', count: 6 },
    ],
    flybys: { kinds: ['android', 'crescent-ship'], gap: [18, 45] },
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
  halloween: { particles: 6 },
  christmas: { particles: 34, flybys: { kinds: ['santa'], gap: [25, 70] } },
  summer: { particles: 14 },
  spring: { particles: 18 },
}

/** Seconds until the first flyby after switching to a theme, so it shows up soon. */
const FIRST_FLYBY: [number, number] = [4, 12]

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
  const scene = effects ? SCENES[theme] : undefined
  if (!scene) return null

  return (
    <>
      <div className="ambient-layer" aria-hidden>
        {Array.from({ length: scene.particles ?? 0 }, (_, i) => (
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
