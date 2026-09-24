import { useState } from 'react'
import { useT } from '../../../i18n/useI18n'

type Drop = { left: number; delay: number; duration: number; width: number; height: number; opacity: number }

function makeDrops(count: number): Drop[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 2.8,
    duration: 0.9 + Math.random() * 1.1,
    width: 2 + Math.random() * 3.5,
    height: 16 + Math.random() * 26,
    opacity: 0.55 + Math.random() * 0.45,
  }))
}

/** Blood drips running down from the top edge of the screen. */
function DripEdge() {
  return (
    <svg className="fallen-drips absolute inset-x-0 top-0 h-[22vh] w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
      <path
        fill="#6e0000"
        d="M0 0H100V3C97 3 96.5 9 95.5 9S94 4 91 4 88 12 86.5 12 85 3 80 3 77 7 75.5 7 74 3 70 3 67 15 65.5 15 64 4 59 4 56 8 54.5 8 53 3 48 3 46 11 44.5 11 43 4 38 4 35 6 33.5 6 32 3 27 3 25 13 23.5 13 22 4 17 4 15 8 13.5 8 12 3 8 3 6 10 4.5 10 3 3 0 3Z"
      />
    </svg>
  )
}

/** The one-shot part: blood rain, dripping edge and the "you have fallen" title. Removes itself once
 * the title's fade-out finishes. */
function BloodRain({ dead }: { dead: boolean }) {
  const t = useT()
  const [drops] = useState(() => makeDrops(70))
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  return (
    <div className="fallen-rain pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      <div className="fallen-flash absolute inset-0" />
      {drops.map((d, i) => (
        <span
          key={i}
          className="fallen-drop absolute -top-12"
          style={{
            left: `${d.left}%`,
            width: `${d.width}px`,
            height: `${d.height}px`,
            opacity: d.opacity,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
      <DripEdge />
      <div
        className="fallen-title absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center"
        onAnimationEnd={(e) => e.target === e.currentTarget && setVisible(false)}
      >
        <span className="text-6xl text-danger drop-shadow-[0_0_24px_#8a0000]">☠</span>
        <p className="font-display text-4xl font-bold uppercase tracking-[0.12em] text-[#d11a1a] drop-shadow-[0_2px_12px_#000] sm:text-6xl">
          {t(dead ? 'fallen.deadTitle' : 'fallen.title')}
        </p>
        <p className="font-display text-sm tracking-[0.18em] text-fg-muted drop-shadow-[0_1px_6px_#000] sm:text-base">
          {t(dead ? 'fallen.deadSubtitle' : 'fallen.subtitle')}
        </p>
      </div>
    </div>
  )
}

type Fate = 'alive' | 'down' | 'dead'
const SEVERITY: Record<Fate, number> = { alive: 0, down: 1, dead: 2 }

/**
 * Easter egg for 0 HP: while the character is down the world loses its colour behind a pulsing
 * blood-red vignette, and the moment HP *drop* to 0 it rains blood with a "you have fallen" title.
 * Reaching the last exhaustion level (death, by the vault rules) plays it again as "you have died"
 * and deepens the vignette. Death saves themselves are the DM's business, so the sheet doesn't
 * track them.
 */
export function FallenOverlay({
  current,
  exhaustion,
  exhaustionMax,
  characterPath,
}: {
  current: number
  exhaustion: number
  exhaustionMax: number
  characterPath: string
}) {
  const fate: Fate = exhaustion >= exhaustionMax ? 'dead' : current <= 0 ? 'down' : 'alive'
  const [prev, setPrev] = useState({ fate, characterPath })
  const [run, setRun] = useState(0)

  // Adjust state during render (React's "previous prop" pattern): only a live change for the worse
  // on the same character triggers the rain; opening a sheet that's already down just shows the
  // vignette.
  if (prev.fate !== fate || prev.characterPath !== characterPath) {
    setPrev({ fate, characterPath })
    if (prev.characterPath === characterPath && SEVERITY[fate] > SEVERITY[prev.fate]) setRun((r) => r + 1)
  }

  if (fate === 'alive') return null
  return (
    <>
      <div className={`fallen-vignette pointer-events-none fixed inset-0 z-40 ${fate === 'dead' ? 'is-dead' : ''}`} aria-hidden />
      {run > 0 && <BloodRain key={run} dead={fate === 'dead'} />}
    </>
  )
}
