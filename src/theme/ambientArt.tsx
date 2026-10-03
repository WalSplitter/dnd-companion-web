import type { ReactNode } from 'react'

/* Drawn figures of the topic themes' ambient layer (see `AmbientLayer`). Motion, size and most
 * colours live in `topics.css`: parts that move carry a class, colours that follow the palette
 * come in as `currentColor` or a custom property. */

/** Pixel art from rows of palette keys ('.' stays empty), one crisp path per colour. */
function pixels(rows: string[], palette: Record<string, string>): ReactNode {
  const runs: Record<string, string> = {}
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const c = row[x]
      let end = x + 1
      while (row[end] === c) end++
      if (c !== '.') runs[c] = (runs[c] ?? '') + `M${x} ${y}h${end - x}v1h${x - end}z`
      x = end
    }
  })
  return Object.entries(runs).map(([c, d]) => <path key={c} fill={palette[c]} d={d} />)
}

/** A dark storm cloud, its underside lit gold by the setting sun. */
const pixelCloud = (
  <svg viewBox="0 0 36 11" shapeRendering="crispEdges">
    {pixels(
      [
        '..............cccc..................',
        '..........cccccKKcc....cccc.........',
        '.......cccKKKKKKKKccccKKKKcc........',
        '.....ccKKKKKKKKKKKKKKKKKKKKKcc......',
        '...ccKKKKKKKKKKKKKKKKKKKKKKKKKcccc..',
        '..cKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKc.',
        '.cKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKc',
        '.gKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKgg',
        '..ggKKKKKKKKKKKKKKKKKKKKKKKKKKKggg..',
        '....gggyyggKKKKKKKKKKKKgggyygg......',
        '.........ggggggggggggggg............',
      ],
      { K: '#34322a', c: '#57543f', g: '#d9892f', y: '#ffd36b' },
    )}
  </svg>
)

const DRAGON = { O: '#1c0d08', R: '#b53a24', h: '#e0683c', E: '#ffe45c', y: '#e9b04a', d: '#7a2418' }

/** A red dragon flying to the right, two frames of wing beat (`.pixel-frame-a/b`). */
const pixelDragon = (
  <svg viewBox="0 0 34 22" shapeRendering="crispEdges">
    <g className="pixel-frame-a">
      {pixels(
        [
          '..........O',
          '..........OO',
          '.........OdO',
          '.........OddOO',
          '........OddddOO',
          '........OdddOddOO',
          '.......OdddOdddddOO',
          '.......OddOdddOddddO',
          '......OddOdddOddddddO',
          '......OdOdddOdddddddO',
          '......OOdddOddddddddO',
          '.......OddOddddddddO',
          '........OOddddddddO',
          '..........OOOOOOOO',
        ],
        DRAGON,
      )}
    </g>
    {pixels(
      [
        '',
        '',
        '',
        '',
        '',
        '',
        '..............................O',
        '............................OOhO',
        '...........................OhRRRO',
        '...........................ORREROO',
        '..........................ORRRRRRRO',
        '......................OOOORRRRROOO',
        '..................OOOORRRRRRRRO',
        '.O.........OOOOOORRRRRRRRRRRO',
        'ORO......OORRhhhhRRRRRRRRRO',
        '.ORO..OOORRRRRRyyyyyyRRRRRO',
        '..ORRRRRRRRRRyyyyyyyyyyRRO',
        '...OOOOORRRRRRyyyyyyyyRRO',
        '........ORRROOOOOOOOORRO',
        '........OROO.......OORO',
        '.......OOO.........OOO',
      ],
      DRAGON,
    )}
    <g className="pixel-frame-b">
      {pixels(
        [
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '..........OOOOOOOOO',
          '..........OdddddddO',
          '.........OddddddddO',
          '........OdddddddOO',
          '.......OddddddOO',
          '......OdddOOO',
          '.....OddOO',
          '....OOO',
          '...O',
        ],
        DRAGON,
      )}
    </g>
  </svg>
)

const KNIGHT = { O: '#14120c', s: '#c3c6cc', S: '#7f838c', B: '#b53a24', Y: '#e8bd4d' }

/** A little knight marching to the right, sword on the shoulder, two frames of steps. */
const pixelKnight = (
  <svg viewBox="0 0 14 17" shapeRendering="crispEdges">
    {pixels(
      [
        '...........O',
        '..........OsO',
        '....OOOO..OsO',
        '...OssssO.OsO',
        '...OsOOOsOOsO',
        '...OSsssO.OsO',
        '..OOOOOOOOOYO',
        '.OsBBBBBBsOOO',
        '.OsBBYBBBssO',
        '.OsBYYYBBsOO',
        '.OSBBYBBBSO',
        '.OOBBBBBBOO',
        '..OSSSSSSO',
        '..OOOOOOOO',
      ],
      KNIGHT,
    )}
    <g className="pixel-frame-a">
      {pixels(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '..OsO..OsO', '..OSO...OSO', '.OOOO...OOOO'], KNIGHT)}
    </g>
    <g className="pixel-frame-b">
      {pixels(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '...OsOOsO', '...OSOOSO', '..OOOOOOOO'], KNIGHT)}
    </g>
  </svg>
)

/** A chibi unicorn hopping to the right with a rainbow mane. */
const unicorn = (
  <svg viewBox="0 0 124 104">
    <g className="unicorn-body">
      <g fill="#f9a8d4">
        <path d="M24 52C10 44 2 56 6 70c2-8 8-12 14-10-6 6-6 14 0 20 0-8 4-14 10-16Z" />
      </g>
      <path d="M24 54C14 50 8 58 10 66c2-5 6-7 10-6Z" fill="#a5b4fc" />
      <g className="unicorn-legs-back" fill="#fff" stroke="#e9d5ff" strokeWidth="2">
        <g>
          <rect x="30" y="66" width="10" height="22" rx="5" />
          <path d="M30 82h10v1a5 5 0 0 1-5 5 5 5 0 0 1-5-5Z" fill="#f9a8d4" stroke="none" />
        </g>
        <g>
          <rect x="42" y="68" width="10" height="20" rx="5" />
          <path d="M42 82h10v1a5 5 0 0 1-5 5 5 5 0 0 1-5-5Z" fill="#f9a8d4" stroke="none" />
        </g>
      </g>
      <g className="unicorn-legs-front" fill="#fff" stroke="#e9d5ff" strokeWidth="2">
        <g>
          <rect x="58" y="68" width="10" height="20" rx="5" />
          <path d="M58 82h10v1a5 5 0 0 1-5 5 5 5 0 0 1-5-5Z" fill="#f9a8d4" stroke="none" />
        </g>
        <g>
          <rect x="70" y="66" width="10" height="22" rx="5" />
          <path d="M70 82h10v1a5 5 0 0 1-5 5 5 5 0 0 1-5-5Z" fill="#f9a8d4" stroke="none" />
        </g>
      </g>
      <ellipse cx="54" cy="60" rx="30" ry="19" fill="#fff" stroke="#e9d5ff" strokeWidth="2" />
      <ellipse cx="76" cy="46" rx="11" ry="15" fill="#fff" />
      <circle cx="88" cy="36" r="19" fill="#fff" stroke="#e9d5ff" strokeWidth="2" />
      <ellipse cx="102" cy="44" rx="11" ry="9" fill="#fff" stroke="#e9d5ff" strokeWidth="2" />
      <path d="M78 22L80 8L88 20Z" fill="#fff" stroke="#e9d5ff" strokeWidth="2" strokeLinejoin="round" />
      <path d="M80.5 18.5L81 12L85 18Z" fill="#fbcfe8" />
      <path d="M88 18L97 -2L98 18Z" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M90 13l7-2M91.5 8l5.5-1.5M93 3.5l4-1" stroke="#f59e0b" strokeWidth="1" />
      <g>
        <circle cx="76" cy="22" r="7" fill="#f472b6" />
        <circle cx="70" cy="30" r="7" fill="#c084fc" />
        <circle cx="67" cy="40" r="6.5" fill="#60a5fa" />
        <circle cx="68" cy="50" r="6" fill="#34d399" />
        <circle cx="72" cy="58" r="5" fill="#fbbf24" />
        <circle cx="84" cy="18" r="5.5" fill="#fb7185" />
      </g>
      <ellipse cx="92" cy="36" rx="4.4" ry="5.6" fill="#2e2240" />
      <circle cx="93.6" cy="33.6" r="1.8" fill="#fff" />
      <circle cx="90.8" cy="38.6" r="0.9" fill="#fff" />
      <path d="M95.5 31.5l2.6-2M96.5 34l3-1" stroke="#2e2240" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="95" cy="46" rx="4.4" ry="2.6" fill="#f9a8d4" opacity="0.85" />
      <path d="M104 49q2.5 2.5 5 0" fill="none" stroke="#2e2240" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="108" cy="42" r="1" fill="#d8b4fe" />
    </g>
  </svg>
)

const heart = (
  <svg viewBox="0 0 24 22">
    <path
      fill="currentColor"
      d="M12 21C4.5 15.5 1 11.6 1 7.4 1 3.9 3.6 1.5 6.6 1.5c2.2 0 4.2 1.2 5.4 3 1.2-1.8 3.2-3 5.4-3 3 0 5.6 2.4 5.6 5.9 0 4.2-3.5 8.1-11 13.6Z"
    />
    <ellipse cx="6.6" cy="6.4" rx="2" ry="1.3" fill="#fff" opacity="0.7" transform="rotate(-30 6.6 6.4)" />
  </svg>
)

/** A smiling little cloud with rosy cheeks. */
const cloud = (
  <svg viewBox="0 0 120 70">
    <path
      fill="#fff"
      stroke="#e9d5ff"
      strokeWidth="2"
      d="M24 64a18 18 0 0 1 1-36 24 24 0 0 1 45-9 20 20 0 0 1 33 16 15 15 0 0 1-2 29Z"
    />
    <g fill="none" stroke="#5b4a70" strokeWidth="2.4" strokeLinecap="round">
      <path d="M44 44q4-5 8 0M68 44q4-5 8 0" />
      <path d="M56 50q4 4 8 0" />
    </g>
    <g fill="#fbcfe8">
      <ellipse cx="40" cy="52" rx="5" ry="3" />
      <ellipse cx="80" cy="52" rx="5" ry="3" />
    </g>
  </svg>
)

function reindeer(x: number, lead: boolean): ReactNode {
  return (
    <g transform={`translate(${x} 18)`}>
      <g className="reindeer-legs-back" stroke="#6b4423" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M10 38l-5 9 2 8" />
        <path d="M14 38l-1 10 4 7" />
      </g>
      <g className="reindeer-legs-front" stroke="#6b4423" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M30 38l6 8-1 8" />
        <path d="M34 37l3 10 5 5" />
      </g>
      <ellipse cx="22" cy="34" rx="17" ry="8" fill="#8b5a2b" />
      <path d="M2 30q-4-3-1-6 3 1 4 5Z" fill="#f4efe6" />
      <path d="M33 33q6-10 8-16l7 2q-2 10-9 18Z" fill="#8b5a2b" />
      <ellipse cx="48" cy="17" rx="7.5" ry="4.8" fill="#9a6532" transform="rotate(18 48 17)" />
      <path d="M42 13l-5-3 5-1Z" fill="#6b4423" />
      <path
        d="M45 12q-2-7-7-10M43 7q-4-1-6-3M47 11q2-7 6-10M49 6q4-1 6-3"
        stroke="#d6b98c"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="46.5" cy="15.5" r="1" fill="#1c120a" />
      <path d="M28 27v15" stroke="#b91c1c" strokeWidth="2.6" />
      <circle cx="28" cy="43" r="2" fill="#e3b95c" />
      <circle
        cx="55"
        cy="20"
        r={lead ? 2.6 : 1.8}
        fill={lead ? '#ef4444' : '#2a1a0e'}
        className={lead ? 'rudolph-nose' : undefined}
      />
    </g>
  )
}

/** Santa in his sleigh behind three reindeer, the lead one with a glowing red nose. */
const santa = (
  <svg viewBox="0 0 300 92">
    <path d="M92 30Q140 44 170 38T230 36T284 38" stroke="#e3b95c" strokeWidth="1.2" fill="none" />
    {reindeer(112, false)}
    {reindeer(170, false)}
    {reindeer(228, true)}
    <g className="santa-sleigh">
      <path d="M26 44q-2-26 16-30 12-2 14 10 4 14-4 22Z" fill="#7c4a1e" />
      <rect x="30" y="8" width="12" height="12" rx="1.5" fill="#15803d" transform="rotate(-12 36 14)" />
      <path d="M36 8v12M30 14h12" stroke="#e3b95c" strokeWidth="2" transform="rotate(-12 36 14)" />
      <ellipse cx="68" cy="38" rx="14" ry="12" fill="#dc2626" />
      <circle cx="68" cy="20" r="7" fill="#f5c9a8" />
      <path d="M58 20q2 14 10 13 8-1 9-13-9 4-19 0Z" fill="#fff" />
      <circle cx="71" cy="18" r="1" fill="#1c120a" />
      <circle cx="74" cy="21" r="1.8" fill="#fca5a5" />
      <path d="M60 16q3-13 15-12 7 2 9 8l-8 2Z" fill="#dc2626" />
      <rect x="59" y="13" width="18" height="4.5" rx="2.2" fill="#fff" />
      <circle cx="85" cy="13" r="3.2" fill="#fff" />
      <path d="M70 36q10-2 20-7" stroke="#dc2626" strokeWidth="5.5" strokeLinecap="round" fill="none" />
      <circle cx="91" cy="29" r="3.2" fill="#15803d" />
      <path d="M18 40q-4 24 14 26h56q14 0 16-16l2-10q-12 6-20 4l-4-6Z" fill="#b91c1c" />
      <path d="M18 40q-8-10-2-18 6-4 8 4" fill="none" stroke="#e3b95c" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 46h78" stroke="#e3b95c" strokeWidth="1.6" opacity="0.8" />
      <path d="M32 66v9M84 66v9" stroke="#e3b95c" strokeWidth="2.5" />
      <path d="M8 76h92q12 0 14-9" fill="none" stroke="#e3b95c" strokeWidth="3" strokeLinecap="round" />
    </g>
  </svg>
)

/** A four-pointed glint twinkling on the gold. */
const glint = (
  <svg viewBox="0 0 24 24">
    <path fill="currentColor" d="M12 0C13 8 16 11 24 12 16 13 13 16 12 24 11 16 8 13 0 12 8 11 11 8 12 0Z" />
  </svg>
)

/* ---------- class themes ---------- */

/** A curse sigil: a thorned ring around a slit-pupilled eye. */
const sigil = (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinejoin="round">
    <circle cx="24" cy="24" r="17" strokeWidth="1.2" />
    <path d="M24 3l2.5 4h-5zM24 45l-2.5-4h5zM3 24l4-2.5v5zM45 24l-4 2.5v-5z" fill="currentColor" stroke="none" />
    <path d="M12 24q12-11 24 0q-12 11-24 0z" strokeWidth="1.4" />
    <ellipse cx="24" cy="24" rx="1.8" ry="4.4" fill="currentColor" stroke="none" />
  </svg>
)

/** One hooded minion of the horde, facing right, eyes aglow. */
function minion(x: number, scale: number, extra?: ReactNode) {
  return (
    <g transform={`translate(${x} ${60 - 36 * scale}) scale(${scale})`}>
      <g className="minion">
        <path d="M2 36q0-22 8-30l3-6 2 7q7 6 7 29z" fill="var(--minion-cloak)" />
        <path d="M9 14q4-3 9 0v6q-4 3-9 0z" fill="#07050a" />
        <circle className="minion-eyes" cx="12" cy="17" r="1.3" fill="var(--color-primary)" />
        <circle className="minion-eyes" cx="16" cy="17" r="1.3" fill="var(--color-primary)" />
        {extra}
      </g>
    </g>
  )
}

/** The horde shuffling along: four minions, one dragging a shovel, the little one at the back
 * holding a flower (absolutely NOT evil). */
const horde = (
  <svg viewBox="0 0 150 62" overflow="visible">
    {minion(
      0,
      0.62,
      <g>
        <path d="M14 25L19 13" stroke="#6fbf5a" strokeWidth="1.4" />
        <circle cx="19.5" cy="11.5" r="2.6" fill="#f472b6" />
        <circle cx="19.5" cy="11.5" r="1" fill="#fde047" />
      </g>,
    )}
    {minion(26, 1)}
    {minion(56, 0.9, <path d="M20 24l14 12M32 34l4 2-1 3-4-2z" stroke="#9a8fa8" strokeWidth="1.8" fill="none" strokeLinecap="round" />)}
    {minion(96, 1.05)}
    {minion(124, 0.82)}
  </svg>
)

/** An arcane circle: two rings, a triangle of the three elements and tick marks, slowly turning. */
const rune = (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2">
    <circle cx="24" cy="24" r="21" />
    <circle cx="24" cy="24" r="16" strokeDasharray="3 2.5" />
    <path d="M24 9L37 31.5H11Z" />
    <circle cx="24" cy="24" r="4.5" />
    <path d="M24 1v4M24 43v4M1 24h4M43 24h4" strokeWidth="1.6" />
  </svg>
)

/** A pair of eyes glinting in the dark, blinking now and then. */
const eyes = (
  <svg viewBox="0 0 40 12">
    <g className="eyes-lids" fill="currentColor">
      <path d="M2 6q6-6 12 0q-6 4-12 0Z" />
      <path d="M26 6q6-6 12 0q-6 4-12 0Z" />
    </g>
  </svg>
)

/** A soul wisp: a glowing head trailing a wavering tail. */
const wisp = (
  <svg viewBox="0 0 60 24" overflow="visible">
    <path
      className="wisp-tail"
      d="M44 12C34 4 24 18 14 10S2 12 0 14C8 16 20 22 30 16S42 16 44 12Z"
      fill="currentColor"
      opacity="0.35"
    />
    <circle cx="48" cy="12" r="7" fill="currentColor" opacity="0.35" />
    <circle cx="48" cy="12" r="4" fill="currentColor" />
  </svg>
)

/** A gust of wind: three curling brush strokes. */
const gust = (
  <svg viewBox="0 0 120 40" fill="none" stroke="currentColor" strokeLinecap="round">
    <path d="M2 14H70q14 0 14-8t-8-6q-6 1-6 6" strokeWidth="2.2" />
    <path d="M18 24H96q12 0 12 7t-8 6" strokeWidth="1.6" />
    <path d="M30 32H62" strokeWidth="1.2" />
  </svg>
)

/** A forked lightning bolt for the storm overhead. */
const bolt = (
  <svg viewBox="0 0 40 120" fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
    <path d="M24 0L16 30L26 36L12 70L20 74L8 120" strokeWidth="2.6" />
    <path d="M26 36L34 56M12 70L4 84" strokeWidth="1.4" />
  </svg>
)

/** A troop marker on the battle map: a chevron heading right. */
const marker = (
  <svg viewBox="0 0 20 20">
    <path d="M4 3L16 10L4 17L7 10Z" fill="currentColor" />
  </svg>
)

/** A ping on the map: an order given somewhere. */
const ping = (
  <svg viewBox="0 0 40 40" fill="none" stroke="currentColor">
    <circle className="ping-ring" cx="20" cy="20" r="18" strokeWidth="1.4" />
    <circle cx="20" cy="20" r="2.5" fill="currentColor" stroke="none" />
  </svg>
)

/** A hawk gliding to the right, wings beating now and then. */
const hawk = (
  <svg viewBox="0 0 80 40" fill="currentColor">
    <g className="hawk-wings">
      <path d="M36 20C28 8 14 4 2 6c10 4 18 9 24 16Z" />
      <path d="M44 20C48 8 56 2 66 0c-6 6-10 12-12 20Z" />
    </g>
    <path d="M22 22q14-6 34-3l8-2 6 3-6 2q-8 4-20 4l-10 6-4-1 4-6q-8 0-12-3Z" />
  </svg>
)

export const AMBIENT_ART = {
  glint,
  'pixel-cloud': pixelCloud,
  'pixel-dragon': pixelDragon,
  'pixel-knight': pixelKnight,
  unicorn,
  heart,
  cloud,
  santa,
  rune,
  eyes,
  wisp,
  gust,
  bolt,
  marker,
  ping,
  hawk,
  sigil,
  horde,
} satisfies Record<string, ReactNode>

export type AmbientArtKind = keyof typeof AMBIENT_ART
