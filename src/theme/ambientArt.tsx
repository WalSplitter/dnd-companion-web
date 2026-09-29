import type { ReactNode } from 'react'
import { WatchingSkull } from './WatchingSkull'

/* Drawn figures of the topic themes' ambient layer (see `AmbientLayer`). Motion, size and most
 * colours live in `topics.css`: parts that move carry a class, colours that follow the palette
 * come in as `currentColor` or a custom property. */

/** A column of tomb glyphs: circles, crescents, bars and dots in a thin frame, glowing green. */
const glyph = (
  <svg viewBox="0 0 24 72" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
    <path d="M3 2h18v68H3Z" strokeWidth="1" opacity="0.5" />
    <circle cx="12" cy="11" r="5" />
    <circle cx="12" cy="11" r="1.4" fill="currentColor" stroke="none" />
    <path d="M6 22q6 8 12 0" />
    <path d="M7 30h10M9 34h6" />
    <path d="M12 38l6 9H6Z" />
    <path d="M12 52v8M7 56h10" />
    <circle cx="8" cy="65" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="16" cy="65" r="1.2" fill="currentColor" stroke="none" />
  </svg>
)

/** A scarab drone seen from above, heading right: metal shell, green eye, clicking legs. */
const scarab = (
  <svg viewBox="0 0 40 30">
    <g className="scarab-legs" stroke="#6f7d7b" strokeWidth="1.6" strokeLinecap="round" fill="none">
      <path d="M14 8l-4-6M20 7l0-6M26 8l4-6M14 22l-4 6M20 23l0 6M26 22l4 6" />
    </g>
    <ellipse cx="18" cy="15" rx="13" ry="9" fill="#9aa8a6" stroke="#3b4b49" strokeWidth="1.2" />
    <path d="M6 15h24" stroke="#3b4b49" strokeWidth="1.2" />
    <path d="M10 10q8-3 16 0M10 20q8 3 16 0" stroke="#dfe7e6" strokeWidth="0.8" fill="none" opacity="0.7" />
    <path d="M30 9l7 6-7 6Z" fill="#6f7d7b" stroke="#3b4b49" strokeWidth="1" />
    <circle className="scarab-eye" cx="33" cy="15" r="1.8" fill="var(--color-primary)" />
  </svg>
)

/** A living-metal warrior marching to the right, rifle levelled, spine and eyes aglow. */
const android = (
  <svg viewBox="0 0 84 120" fill="none" strokeLinecap="square" strokeLinejoin="round">
    <g className="android-body">
      <path d="M24 4h16l4 6v10l-4 6H26l-4-6V10Z" fill="#aab6b4" stroke="#3b4b49" strokeWidth="1" />
      <path d="M26 20h12M26 23h12" stroke="#3b4b49" strokeWidth="1" />
      <g className="android-eyes" fill="var(--color-primary)">
        <path d="M27 11h6v3h-6Z" />
        <path d="M35 11h6v3h-6Z" />
      </g>
      <path d="M32 26v5" stroke="#6f7d7b" strokeWidth="3" />
      <path d="M18 32h28" stroke="#aab6b4" strokeWidth="4" />
      <path d="M22 39h20M23 45h18M25 51h14" stroke="#8d9a98" strokeWidth="3" />
      <path d="M32 31v31" stroke="var(--color-primary)" strokeWidth="2" className="android-core" />
      <path d="M24 62h16l-4 7h-8Z" fill="#8d9a98" stroke="#3b4b49" strokeWidth="1" />
      <path d="M20 33l8 16 10 4M44 33l8 12 8 4" stroke="#aab6b4" strokeWidth="3" />
      <path d="M30 51h52" stroke="#2b3533" strokeWidth="6" />
      <path d="M36 51h42" stroke="var(--color-primary)" strokeWidth="1.4" className="android-core" />
      <path d="M78 46l6 5-6 5Z" fill="#aab6b4" />
    </g>
    <g className="android-leg-back">
      <path d="M28 68l-2 22 1 22h7" stroke="#8d9a98" strokeWidth="3.4" />
    </g>
    <g className="android-leg-front">
      <path d="M36 68l2 22-1 22h7" stroke="#aab6b4" strokeWidth="3.4" />
    </g>
  </svg>
)

/** A crescent tomb ship gliding to the right, hull spines and lights aglow. */
const crescentShip = (
  <svg viewBox="0 0 200 80">
    <path d="M26 30l-4-16 10 12M60 44l-2-18 8 16M100 50l0-22 6 21M140 48l4-20 2 19" fill="#2b3533" />
    <path d="M6 14C30 72 150 84 196 30 150 60 70 58 6 14Z" fill="#141b1c" stroke="#6f7d7b" strokeWidth="1.2" />
    <path
      d="M18 30C50 62 140 70 186 38"
      fill="none"
      stroke="var(--color-primary)"
      strokeWidth="1"
      strokeDasharray="2 6"
      opacity="0.9"
    />
    <ellipse
      className="ship-engine"
      cx="16"
      cy="26"
      rx="8"
      ry="4"
      fill="var(--color-primary)"
      opacity="0.8"
      transform="rotate(35 16 26)"
    />
  </svg>
)

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

export const AMBIENT_ART = {
  glyph,
  scarab,
  android,
  'crescent-ship': crescentShip,
  'watching-skull': <WatchingSkull />,
  glint,
  'pixel-cloud': pixelCloud,
  'pixel-dragon': pixelDragon,
  'pixel-knight': pixelKnight,
  unicorn,
  heart,
  cloud,
  santa,
} satisfies Record<string, ReactNode>

export type AmbientArtKind = keyof typeof AMBIENT_ART
