/**
 * Condition rings for tokens in Owlbear Rodeo, in the style of the rings Owlbear offers as
 * attachments: a coloured band over the token's rim with an emblem and the name — or, for several
 * conditions, a bare band carrying one medallion each.
 * Generated as SVG files at build time (see `vite.config.ts`) and drawn by `tokenMarkers.ts`.
 *
 * Imports nothing, so the build config can use it as well.
 */

/** Emblem and band colour per condition of rule `Zustände`, by the vault's own names. */
export const CONDITION_STYLES: Record<string, { icon: string; color: string }> = {
  Abgelenkt: { icon: '💭', color: '#5e7186' },
  Bedroht: { icon: '⚠️', color: '#9a5530' },
  Belastet: { icon: '🎒', color: '#76643f' },
  Benommen: { icon: '💫', color: '#80733a' },
  Betrunken: { icon: '🍺', color: '#a87a2a' },
  Betäubt: { icon: '⚡', color: '#7d7b35' },
  Bewusstlos: { icon: '💤', color: '#57467a' },
  Bezaubert: { icon: '💘', color: '#9a5577' },
  Blind: { icon: '🙈', color: '#7a3b3b' },
  Festgesetzt: { icon: '⛓️', color: '#64754a' },
  Gelähmt: { icon: '🧊', color: '#a05f36' },
  Gepackt: { icon: '✊', color: '#4a5878' },
  Kampfunfähig: { icon: '⛔', color: '#975528' },
  Liegend: { icon: '🛌', color: '#5c6868' },
  Provoziert: { icon: '😡', color: '#a8392c' },
  Reitend: { icon: '🐎', color: '#86673a' },
  Sterbend: { icon: '💀', color: '#861d1d' },
  Taub: { icon: '🙉', color: '#3a5886' },
  Unsichtbar: { icon: '👻', color: '#75695b' },
  Verborgen: { icon: '🌫️', color: '#485858' },
  Verlangsamt: { icon: '🐌', color: '#477566' },
  Versteinert: { icon: '🗿', color: '#67717c' },
  Verängstigt: { icon: '😱', color: '#873a2a' },
}

const EXHAUSTION_COLOR = '#8a5528'
/** Rings drawn for exhaustion levels 1…this (higher levels show this one). */
export const EXHAUSTION_RINGS = 9

export const conditionIcon = (condition: string) => CONDITION_STYLES[condition]?.icon ?? '❔'

/** The token's radius in the ring's own units; the band sits on its rim, the emblem sticks out on top. */
export const RING_TOKEN_RADIUS = 100
/** Width and height of a ring in its own units — the token's diameter plus room for the emblem. */
export const RING_SIZE = 248

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')

/** The file a condition's ring is served as, below `owlbear-rings/`. */
export const conditionRingFile = (condition: string) => `${slug(condition)}.svg`
export const exhaustionRingFile = (level: number) => `erschoepft-${Math.min(EXHAUSTION_RINGS, Math.max(1, level))}.svg`

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** `hex` moved `amount` (0…1) of the way towards white (positive) or black (negative). */
function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `#${channels.map((v) => Math.round(v + (target - v) * Math.abs(amount)).toString(16).padStart(2, '0')).join('')}`
}

/** A stable small number from `text`, so every ring gets its own wear but the same one each build. */
const seedOf = (text: string) => [...text].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 997, 7)

const round = (n: number) => Math.round(n * 100) / 100
const polar = (c: number, radius: number, degrees: number) => {
  const angle = (degrees * Math.PI) / 180
  return { x: round(c + Math.cos(angle) * radius), y: round(c + Math.sin(angle) * radius) }
}
/** An SVG arc around the centre from `from` to `to` degrees, clockwise (y points down). */
const arcPath = (c: number, radius: number, from: number, to: number) => {
  const a = polar(c, radius, from)
  const b = polar(c, radius, to)
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`
}

/** Where the emblem and the name sit, in degrees clockwise from the right — both on the upper half,
 * as Clash puts its HP bar over the lower one. */
export const RING_LAYOUT = { emblem: 312, label: 232 } as const

/** Band colour of the bare ring that carries several conditions' medallions. */
const BAND_COLOR = '#6e5531'

/** Width and height of a lone medallion in its own units (see `medalSvg`); its rim has radius 21, as on a ring. */
export const MEDAL_SIZE = 48

const GOLD = `<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fbe7a1"/><stop offset="0.45" stop-color="#c9973a"/><stop offset="0.7" stop-color="#7a5418"/><stop offset="1" stop-color="#e2bd62"/>
  </linearGradient>`
const well = (color: string) => `<radialGradient id="well" cx="50%" cy="40%" r="65%">
    <stop offset="0" stop-color="${shade(color, -0.35)}"/><stop offset="1" stop-color="${shade(color, -0.85)}"/>
  </radialGradient>`

/** A medallion at `x`, `y`: a gold rim around a well holding `emblem` — an emoji, or a number drawn in red. */
function medalMarkup(x: number, y: number, emblem: string, numeric: boolean): string {
  const face = numeric
    ? `<text x="${x}" y="${y + 1}" font-family="Georgia, serif" font-size="${emblem.length > 1 ? 17 : 22}" font-weight="700" fill="#ff6b5b" stroke="#2a0805" stroke-width="2" paint-order="stroke" text-anchor="middle" dominant-baseline="central">${escape(emblem)}</text>`
    : `<text x="${x}" y="${y + 1.5}" font-family="'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif" font-size="19" text-anchor="middle" dominant-baseline="central">${emblem}</text>`
  return `<circle cx="${x}" cy="${y}" r="21" fill="url(#gold)" stroke="#3a2808" stroke-width="1.2"/>
  <circle cx="${x}" cy="${y}" r="16.5" fill="url(#well)" stroke="#2a1d08" stroke-width="1.2"/>
  <ellipse cx="${x - 5}" cy="${y - 9}" rx="7" ry="3" fill="#fff" fill-opacity="0.18" transform="rotate(-30 ${x - 5} ${y - 9})"/>
  ${face}`
}

/**
 * One ring as SVG: a worn, bevelled band with rivets — with an emblem in a metal medallion and the
 * name on a dark ribbon for a single condition, or bare (no `label`, no `emblem`) to carry several
 * medallions drawn on their own (see `medalSvg`). `emblem` is an emoji, or a number drawn in red (exhaustion).
 */
export function ringSvg({ label, emblem, color, numeric = false }: { label?: string; emblem?: string; color: string; numeric?: boolean }): string {
  const c = RING_SIZE / 2
  const band = RING_TOKEN_RADIUS - 2
  const width = 22
  const inner = band - width / 2
  const outer = band + width / 2
  const seed = seedOf(label ?? color)
  const stop = (radius: number) => round(radius / (outer + 1))

  // The name: its ribbon spans the text plus some room, centred on `RING_LAYOUT.label`.
  const text = (label ?? '').toUpperCase()
  const fontSize = 12.5
  const span = label ? Math.min(130, ((text.length * fontSize * 0.74 + 18) / band) * (180 / Math.PI)) : 0
  const ribbonFrom = RING_LAYOUT.label - span / 2
  const ribbonTo = RING_LAYOUT.label + span / 2
  // Clockwise over the top, the letters stand on the baseline and reach outwards into the band.
  const baseline = band - 4.5

  // Rivets around the band, clear of the ribbon and the emblem.
  const rivets = Array.from({ length: 12 }, (_, i) => i * 30 + 15)
    .filter((angle) => {
      const near = (target: number, gap: number) => Math.abs(((angle - target + 540) % 360) - 180) < gap
      return !(emblem && near(RING_LAYOUT.emblem, 22)) && !(label && angle > ribbonFrom - 8 && angle < ribbonTo + 8)
    })
    .map((angle) => polar(c, band, angle))

  const medal = polar(c, band, RING_LAYOUT.emblem)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${RING_SIZE * 2}" height="${RING_SIZE * 2}" viewBox="0 0 ${RING_SIZE} ${RING_SIZE}">
<defs>
  <radialGradient id="bevel" gradientUnits="userSpaceOnUse" cx="${c}" cy="${c}" r="${outer + 1}">
    <stop offset="${stop(inner - 1)}" stop-color="${shade(color, -0.7)}"/>
    <stop offset="${stop(inner + 2)}" stop-color="${shade(color, 0.35)}"/>
    <stop offset="${stop(band - 2)}" stop-color="${shade(color, 0.08)}"/>
    <stop offset="${stop(band + 4)}" stop-color="${color}"/>
    <stop offset="${stop(outer - 2.5)}" stop-color="${shade(color, -0.35)}"/>
    <stop offset="1" stop-color="${shade(color, -0.75)}"/>
  </radialGradient>
  <radialGradient id="rivet" cx="35%" cy="35%" r="70%">
    <stop offset="0" stop-color="#fff6d8"/><stop offset="0.45" stop-color="#c9a24c"/><stop offset="1" stop-color="#4a3410"/>
  </radialGradient>
  ${GOLD}
  ${well(color)}
  <filter id="worn" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="${seed}" result="warp"/>
    <feDisplacementMap in="SourceGraphic" in2="warp" scale="4.5" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${seed + 1}" result="noise"/>
    <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.25" result="speckle"/>
    <feComposite in="SourceGraphic" in2="speckle" operator="in"/>
  </filter>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="1.8" stdDeviation="2.2" flood-color="#000" flood-opacity="0.7"/>
  </filter>
  <path id="name" d="${arcPath(c, baseline, RING_LAYOUT.label - 90, RING_LAYOUT.label + 90)}"/>
</defs>
<g filter="url(#shadow)">
  <g filter="url(#worn)">
    <circle cx="${c}" cy="${c}" r="${band}" fill="none" stroke="#120d09" stroke-width="${width + 4}"/>
    <circle cx="${c}" cy="${c}" r="${band}" fill="none" stroke="url(#bevel)" stroke-width="${width}"/>
    <circle cx="${c}" cy="${c}" r="${band}" fill="none" stroke="#000" stroke-opacity="0.4" stroke-width="${width}" filter="url(#grain)"/>
  </g>
  <circle cx="${c}" cy="${c}" r="${inner + 3.5}" fill="none" stroke="${shade(color, 0.55)}" stroke-opacity="0.35" stroke-width="0.8"/>
  <circle cx="${c}" cy="${c}" r="${outer - 3.5}" fill="none" stroke="#000" stroke-opacity="0.45" stroke-width="0.9" stroke-dasharray="7 3 1.5 3"/>
  ${rivets.map(({ x, y }) => `<circle cx="${x}" cy="${y}" r="2.9" fill="url(#rivet)" stroke="#2a1d08" stroke-width="0.6"/>`).join('')}
  ${
    label
      ? `<path d="${arcPath(c, band, ribbonFrom, ribbonTo)}" fill="none" stroke="${shade(color, 0.45)}" stroke-width="17" stroke-linecap="round"/>
  <path d="${arcPath(c, band, ribbonFrom, ribbonTo)}" fill="none" stroke="#140f0b" stroke-opacity="0.92" stroke-width="15" stroke-linecap="round"/>
  <text font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="700" letter-spacing="1.1" fill="#f8eccd" text-anchor="middle"><textPath href="#name" startOffset="50%">${escape(text)}</textPath></text>`
      : ''
  }
  ${emblem ? medalMarkup(medal.x, medal.y, emblem, numeric) : ''}
</g>
</svg>
`
}

/** A lone medallion as SVG, for the bare ring of a token with several conditions. */
export function medalSvg({ emblem, color, numeric = false }: { emblem: string; color: string; numeric?: boolean }): string {
  const c = MEDAL_SIZE / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MEDAL_SIZE * 2}" height="${MEDAL_SIZE * 2}" viewBox="0 0 ${MEDAL_SIZE} ${MEDAL_SIZE}">
<defs>
  ${GOLD}
  ${well(color)}
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-color="#000" flood-opacity="0.7"/>
  </filter>
</defs>
<g filter="url(#shadow)">
  ${medalMarkup(c, c, emblem, numeric)}
</g>
</svg>
`
}

/** The bare ring that carries several medallions. */
export const BAND_RING_FILE = 'band.svg'
/** Medallions shown at most on one token; beyond, the last one says how many more there are. */
export const MAX_MEDALS = 6
export const conditionMedalFile = (condition: string) => `medal-${slug(condition)}.svg`
export const exhaustionMedalFile = (level: number) => `medal-erschoepft-${Math.min(EXHAUSTION_RINGS, Math.max(1, level))}.svg`
export const moreMedalFile = (count: number) => `medal-more-${Math.min(9, Math.max(2, count))}.svg`

/** Every ring and medallion as file name → SVG: one each per condition and exhaustion level, plus the bare ring and "+n". */
export function ringFiles(): Record<string, string> {
  const files: Record<string, string> = { [BAND_RING_FILE]: ringSvg({ color: BAND_COLOR }) }
  for (const [condition, { icon, color }] of Object.entries(CONDITION_STYLES)) {
    files[conditionRingFile(condition)] = ringSvg({ label: condition, emblem: icon, color })
    files[conditionMedalFile(condition)] = medalSvg({ emblem: icon, color })
  }
  for (let level = 1; level <= EXHAUSTION_RINGS; level++) {
    files[exhaustionRingFile(level)] = ringSvg({ label: 'Erschöpft', emblem: String(level), color: EXHAUSTION_COLOR, numeric: true })
    files[exhaustionMedalFile(level)] = medalSvg({ emblem: String(level), color: EXHAUSTION_COLOR, numeric: true })
  }
  for (let count = 2; count <= 9; count++) files[moreMedalFile(count)] = medalSvg({ emblem: `+${count}`, color: BAND_COLOR, numeric: true })
  return files
}
