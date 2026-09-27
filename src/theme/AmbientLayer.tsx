import type { CSSProperties } from 'react'
import { useThemeStore, type ThemeName } from './themeStore'

/** Particles per topic theme; the look and motion of each lives in `topics.css`. */
const PARTICLE_COUNT: Partial<Record<ThemeName, number>> = {
  necromancer: 18,
  shadowmaster: 7,
  unicorn: 22,
  halloween: 6,
  christmas: 34,
  summer: 14,
  spring: 18,
}

/** Deterministic 0..1 noise, so particles keep their spots across re-renders. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Fixed layer behind the page holding a topic theme's ambient particles (souls, bats, snow ...).
 * Each particle only gets three random numbers (`--r1..--r3`); the theme's CSS turns them into
 * position, size, speed and delay. Hidden for users who prefer reduced motion.
 */
export function AmbientLayer() {
  const theme = useThemeStore((s) => s.theme)
  const effects = useThemeStore((s) => s.effects)
  const count = effects ? (PARTICLE_COUNT[theme] ?? 0) : 0
  if (count === 0) return null

  return (
    <div className="ambient-layer" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={`${theme}-${i}`}
          className="ambient-particle"
          style={
            {
              '--r1': noise(i + 1).toFixed(3),
              '--r2': noise(i + 101).toFixed(3),
              '--r3': noise(i + 201).toFixed(3),
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
