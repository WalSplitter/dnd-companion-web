import { useT } from '../../i18n/useI18n'

/** An orc seen from the front: hunched shoulders, tusks, a raised axe. Drawn around `x`, feet on y=100. */
function Orc({ x, flip = false }: { x: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} 0)${flip ? ' scale(-1 1)' : ''}`}>
      {/* axe behind the shoulder */}
      <path d="M20 96 28 44" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M26 42c10-6 18-4 22 2-8 2-14 8-16 16-4-6-6-12-6-18Z" />
      <path d="M-30 100c0-18 10-30 30-30s30 12 30 30Z" />
      <ellipse cx="0" cy="60" rx="13" ry="14" />
      <path d="M-12 56-22 48-13 63ZM12 56l10-8-9 15Z" />
      <path d="M-6 68-5 60-3 68ZM6 68l-1-8-2 8Z" className="formation-foe-tusk" />
      <circle cx="-5" cy="56" r="1.7" className="formation-foe-eye" />
      <circle cx="5" cy="56" r="1.7" className="formation-foe-eye" />
    </g>
  )
}

/** A dragon rearing up behind them, wings spread, horned head lowered towards the party. */
function Dragon({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M0 64-78 6l12 26-34-6 22 22-30 2 50 24Z" />
      <path d="M0 64 78 6 66 32l34-6-22 22 30 2-50 24Z" />
      <path d="M-24 100c0-30 10-50 24-56 14 6 24 26 24 56Z" />
      <path d="M-13 40-9 20 0 13 9 20 13 40 0 52Z" />
      <path d="M-9 22-24-2-4 17ZM9 22 24-2 4 17Z" />
      <circle cx="-5" cy="30" r="2" className="formation-foe-eye" />
      <circle cx="5" cy="30" r="2" className="formation-foe-eye" />
    </g>
  )
}

/**
 * The enemy across the top of the formation stage — a dragon flanked by two orcs, staring down the
 * front line — so it's obvious at a glance which way the party faces. Purely decorative.
 */
export function FormationEnemy({ height }: { height: number }) {
  const t = useT()
  return (
    <div className="formation-foe" style={{ height }} title={t('characterList.enemySide')}>
      <svg viewBox="0 -6 400 106" preserveAspectRatio="xMidYMax meet" aria-hidden className="h-full w-full" fill="currentColor">
        <Orc x={112} />
        <Dragon x={200} />
        <Orc x={288} flip />
      </svg>
    </div>
  )
}
