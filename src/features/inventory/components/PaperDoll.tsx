import { useId } from 'react'
import { useT } from '../../../i18n/useI18n'
import type { EndeavourWeaponForm } from '../../../vault/adapters/endeavourItem'
import { formatModifier } from '../../../vault/deriveStats'
import type { ArmorLook } from '../equipment'

/** A stat the loadout just changed, floated up over the paper doll for a moment. */
export interface StatDelta {
  id: number
  label: string
  delta: number
}

/** A part of the paper doll that lights up — one per slot (`ring0`/`ring1` per finger). */
export type DollPart = 'head' | 'cloak' | 'armor' | 'gloves' | 'belt' | 'boots' | 'necklace' | 'ring0' | 'ring1' | 'shield' | 'weapon'

/**
 * A shadowed full-body silhouette standing in a pool of light. Each worn piece is drawn over it in
 * gilt — a cloak falling behind it, a helm, the body armor by its class (`ArmorFigure`), a belt,
 * gauntlets, boots, a pendant, a glint on each ring finger, a shield on one arm and the weapon by its
 * form in the other hand (`WeaponFigure`) — and the part the hovered slot belongs to glows faintly even
 * while empty. Armor class and evasion sit on a plate at its feet; stat deltas float up from its chest.
 */
export function PaperDoll({
  parts,
  armorLook,
  weapons,
  hovered,
  armorClass,
  evasion,
  deltas,
  onDeltaDone,
}: {
  parts: Record<DollPart, boolean>
  armorLook: ArmorLook | undefined
  /** The equipped weapons in order: the first is drawn in the main hand. */
  weapons: { form: EndeavourWeaponForm | undefined; twoHanded: boolean }[]
  hovered: DollPart | undefined
  armorClass: number
  evasion: number | undefined
  deltas: StatDelta[]
  onDeltaDone: (id: number) => void
}) {
  const t = useT()
  const id = useId()
  const part = (name: DollPart) => `equip-doll-part ${parts[name] ? 'is-on' : ''} ${hovered === name ? 'is-hover' : ''}`
  const [mainHand, second] = weapons
  const offHand = !parts.shield && mainHand && second && isOneHanded(mainHand) && isOneHanded(second) ? second : undefined

  return (
    <div className="relative flex min-w-0 flex-col items-center justify-between gap-1" aria-hidden>
      <svg viewBox="-26 0 172 220" className="equip-doll min-h-0 w-full max-w-56 flex-1">
        <defs>
          <radialGradient id={`${id}-light`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" className="equip-doll-light-core" />
            <stop offset="100%" className="equip-doll-light-edge" />
          </radialGradient>
          <linearGradient id={`${id}-body`} gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="215">
            <stop offset="0%" className="equip-doll-body-top" />
            <stop offset="100%" className="equip-doll-body-bottom" />
          </linearGradient>
          {/* Mail or scale for medium armor: overlapping rows of small arcs. */}
          <pattern id={`${id}-scale`} width="5" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 3 Q2.5 -1 5 3 M-2.5 6 Q0 2 2.5 6 M2.5 6 Q5 2 7.5 6" className="equip-doll-scale" />
          </pattern>
          {/* Polished metal: each plate catches the light on its upper edge and darkens below. */}
          <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" className="equip-doll-plate-hi" />
            <stop offset="45%" className="equip-doll-plate-mid" />
            <stop offset="100%" className="equip-doll-plate-lo" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="110" rx="58" ry="104" fill={`url(#${id}-light)`} />
        <ellipse cx="60" cy="212" rx="36" ry="5" className="equip-doll-shadow" />

        {/* The cloak hangs behind the figure, so it is drawn first; its collar sits in front (below). */}
        <g className={part('cloak')}>
          <path d="M30 47 Q60 38 90 47 Q97 100 104 170 Q90 178 78 172 Q60 180 42 172 Q30 178 16 170 Q23 100 30 47 Z" className="equip-doll-fill equip-doll-cloak" />
          <path d="M26 92 Q22 130 20 166 M94 92 Q98 130 100 166 M60 120 V174" className="equip-doll-line equip-doll-fold" />
        </g>

        {/* The figure: a sturdy, heroic build — broad shoulders sloping from a strong neck, a
            V-shaped torso, powerful arms and legs — kept as a clean silhouette without inner
            lines, so the gear drawn over it carries the detail. */}
        <g fill={`url(#${id}-body)`} stroke="none" className="equip-doll-figure">
          <path d="M60 7 C52 7 48.5 13 48.5 20.5 C48.5 27 50 31.5 53 34.5 C55.5 37 58 38 60 38 C62 38 64.5 37 67 34.5 C70 31.5 71.5 27 71.5 20.5 C71.5 13 68 7 60 7 Z" />
          <path d="M54 31 C54 37 53.5 40 51 42 C46 44 38 45 33 49 C29 51 28 58 31 64 C34 70 37 76 39 84 C41 92 42 98 42 102 C41 108 38 114 38 124 C38 138 41 150 43 160 C40 168 40 178 42 188 C43 194 44 199 44 204 L55 204 C55 196 56 188 56 180 C57 172 56 166 56 160 C56 146 57 134 58 126 Q60 120 62 126 C63 134 64 146 64 160 C64 166 63 172 64 180 C64 188 65 196 65 204 L76 204 C76 199 77 194 78 188 C80 178 80 168 77 160 C79 150 82 138 82 124 C82 114 79 108 78 102 C78 98 79 92 81 84 C83 76 86 70 89 64 C92 58 91 51 87 49 C82 45 74 44 69 42 C66.5 40 66 37 66 31 Z" />
          <path d="M34 48 C28 49.5 25 55 25.5 62 C26 70 25.5 80 25.5 88 C25 96 22 106 19.5 116 L28.5 117.5 C30 108 33.5 98 35 90 C37 82 38.5 74 38 66 Z" />
          <path d="M86 48 C92 49.5 95 55 94.5 62 C94 70 94.5 80 94.5 88 C95 96 98 106 100.5 116 L91.5 117.5 C90 108 86.5 98 85 90 C83 82 81.5 74 82 66 Z" />
          <ellipse cx="24" cy="123.5" rx="5.8" ry="7.8" transform="rotate(12 24 123.5)" />
          <ellipse cx="96" cy="123.5" rx="5.8" ry="7.8" transform="rotate(-12 96 123.5)" />
          <ellipse cx="48" cy="207" rx="8.5" ry="4" />
          <ellipse cx="72" cy="207" rx="8.5" ry="4" />
        </g>

        <g className={part('cloak')}>
          <path d="M33 46 Q46 54 60 52 Q74 54 87 46 Q74 41 60 42 Q46 41 33 46 Z" className="equip-doll-fill" />
          <circle cx="60" cy="51" r="2.6" className="equip-doll-gem" />
        </g>

        {/* Body armor, drawn by its class (an empty slot's hover ghost shows plate). */}
        <g className={part('armor')}>
          <ArmorFigure look={armorLook ?? 'heavy'} id={id} />
        </g>
        {/* A belt over the waist of the harness, and a helm with a nasal over the head. */}
        <g className={part('belt')}>
          <path d="M40 100 Q60 107 80 100 L80.5 106.5 Q60 113.5 39.5 106.5 Z" className="equip-doll-fill" />
          <rect x="56.5" y="104.5" width="7" height="6" rx="1" className="equip-doll-buckle" />
        </g>
        <g className={part('head')}>
          <path d="M47 25 C47 12.5 52 5 60 5 C68 5 73 12.5 73 25 L73 30 Q66.5 27.5 60 28 Q53.5 27.5 47 30 Z" className="equip-doll-fill" />
          <path d="M47.5 21 Q60 17 72.5 21 M60 5.5 V17.5" className="equip-doll-line" />
          <path d="M58.6 19 H61.4 V31 L60 32.5 L58.6 31 Z" className="equip-doll-fill" />
        </g>
        <g className={part('necklace')}>
          <path d="M52.5 41 Q54 52 60 56 Q66 52 67.5 41" className="equip-doll-line equip-doll-chain" />
          <path d="M60 55 L56 60 L60 66 L64 60 Z" className="equip-doll-fill" />
        </g>
        <g className={part('gloves')}>
          <path d="M16.5 110 H31.5 L30.5 117 V127 Q30.5 133.5 24 133.5 Q17.5 133.5 17.5 127 V117 Z M103.5 110 H88.5 L89.5 117 V127 Q89.5 133.5 96 133.5 Q102.5 133.5 102.5 127 V117 Z" className="equip-doll-fill" />
          <path d="M18 117 H30.5 M18 122 H30 M102 117 H89.5 M102 122 H90" className="equip-doll-line" />
        </g>
        <g className={part('boots')}>
          <path d="M39.5 175 H57 L56.5 201 Q60 204 58 210.5 H38 Q36 204 40 201 Z M80.5 175 H63 L63.5 201 Q60 204 62 210.5 H82 Q84 204 80 201 Z" className="equip-doll-fill" />
          <path d="M39.5 181 H57 M80.5 181 H63" className="equip-doll-line" />
        </g>
        {/* Sword and shield are held at the sides, clear of the body, roughly to scale with the ~1.8 m
            figure (220 units): a ~75 cm blade lowered and pointing out and down, and a ~70 cm heater
            shield hanging off the outside of the other hand, from the wrist to below the knee. */}
        <g className={part('shield')}>
          <path d="M94 97 Q119 88 144 97 V124 C144 148 132 162 119 171 C106 162 94 148 94 124 Z" className="equip-doll-fill" />
          <path d="M119 93 V167 M95 119 H143" className="equip-doll-line" />
          <circle cx="119" cy="119" r="5.5" className="equip-doll-fill" />
        </g>
        <g className={part('weapon')}>
          <WeaponFigure form={mainHand?.form} />
          {/* A second one-handed weapon goes into the off hand when no shield takes it. */}
          {offHand && (
            <g transform="matrix(-1 0 0 1 120 0)">
              <WeaponFigure form={offHand.form} />
            </g>
          )}
        </g>
        {/* Rings last, so the glint shows over a sword grip or a shield's rim. */}
        <g className={part('ring0')}>
          <circle cx="96" cy="128" r="3.6" className="equip-doll-ring" />
          <circle cx="96" cy="124.1" r="1.9" className="equip-doll-gem" />
        </g>
        <g className={part('ring1')}>
          <circle cx="24" cy="128" r="3.6" className="equip-doll-ring" />
          <circle cx="24" cy="124.1" r="1.9" className="equip-doll-gem" />
        </g>
      </svg>

      <div className="rpg-plate flex items-center gap-2 px-2 py-0.5 font-num text-[0.7rem] leading-tight">
        <span title={t('stats.armorClass')}>
          <span className="text-trim/80">{t('short.armorClass')}</span> <span className="font-semibold text-fg">{armorClass}</span>
        </span>
        {evasion !== undefined && (
          <span title={t('stats.evasion')}>
            <span className="text-trim/80">{t('short.evasion')}</span> <span className="font-semibold text-fg">{evasion}</span>
          </span>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-[-1rem] top-1/3 z-10 flex flex-col items-center gap-1">
        {deltas.map((d) => (
          <span
            key={d.id}
            onAnimationEnd={() => onDeltaDone(d.id)}
            className={`equip-delta rpg-plate whitespace-nowrap px-1.5 py-px font-num text-xs ${d.delta > 0 ? 'text-success' : 'text-danger'}`}
          >
            {formatModifier(d.delta)} {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * The body-armor slot's item over the figure, by class: a cloth tunic with short sleeves; a leather
 * jerkin with shoulder caps, bracers and stitched seams; a scale hauberk to mid-thigh with elbow
 * sleeves and small pauldrons; or a full plate harness — everything the other slots don't cover:
 * breastplate, pauldrons, arm plates down to the wrists, tassets, thigh plates, knee cops and greaves.
 */
function ArmorFigure({ look, id }: { look: ArmorLook; id: string }) {
  if (look === 'clothing') {
    return (
      <>
        <path
          d="M47 43 Q60 51 73 43 L86 48 C93 50 96 56 95.5 68 L83 70 C81 80 80 90 80 100 C81 112 83 122 84 134 Q60 140 36 134 C37 122 39 112 40 100 C40 90 39 80 37 70 L24.5 68 C24 56 27 50 34 48 Z"
          className="equip-doll-cloth"
        />
        <path d="M53 45 L60 55 L67 45 M25 63.5 L37.5 65.5 M95 63.5 L82.5 65.5" className="equip-doll-line equip-doll-etch" />
        <path d="M50 110 L47 134 M70 110 L73 134 M60 108 V137" className="equip-doll-line equip-doll-fold" />
      </>
    )
  }
  if (look === 'light') {
    return (
      <>
        <g className="equip-doll-leather">
          <path d="M47 43 Q60 50 73 43 L85 49 C87 57 86 64 83 70 C81 80 80 92 80 104 L81 116 Q60 122 39 116 L40 104 C40 92 39 80 37 70 C34 64 33 57 35 49 Z" />
          <path d="M23.5 64 C23.5 54 29.5 48 38 48 L39.5 56 C33 56 29 60 28 66 Z M96.5 64 C96.5 54 90.5 48 82 48 L80.5 56 C87 56 91 60 92 66 Z" />
          <path d="M24.3 96 L34 96 L29.6 111 L21 111 Z M95.7 96 L86 96 L90.4 111 L99 111 Z" />
        </g>
        <path
          d="M60 47 V118 M38.5 72 Q49 78 60 74 Q71 78 81.5 72 M40.5 109 Q60 115 79.5 109 M25.5 100 H32.8 M94.5 100 H87.2"
          className="equip-doll-line equip-doll-stitch"
        />
        <g className="equip-doll-rivet">
          <circle cx="46" cy="62" r="0.9" />
          <circle cx="74" cy="62" r="0.9" />
          <circle cx="45" cy="88" r="0.9" />
          <circle cx="75" cy="88" r="0.9" />
          <circle cx="31" cy="55" r="0.8" />
          <circle cx="89" cy="55" r="0.8" />
        </g>
      </>
    )
  }
  if (look === 'medium') {
    const hauberk =
      'M47 43 Q60 50 73 43 L86 50 C88 58 87 64 84 70 C81 80 80 90 80 100 C81 112 82 124 82.5 141 L63.5 142 L60 128 L56.5 142 L37.5 141 C38 124 39 112 40 100 C40 90 39 80 36 70 C33 64 32 58 34 50 Z M34 48 C28 49.5 25 55 25.5 62 L25.3 88 L36.4 88 C37.4 80 38.5 72 38 66 Z M86 48 C92 49.5 95 55 94.5 62 L94.7 88 L83.6 88 C82.6 80 81.5 72 82 66 Z'
    return (
      <>
        <path d={hauberk} fill={`url(#${id}-plate)`} className="equip-doll-plate" />
        <path d={hauberk} fill={`url(#${id}-scale)`} stroke="none" />
        <path
          d="M22.5 62 C21.5 52 29 45.5 39 46 L43 50.5 C36 51 29.5 55.5 27 65 Z M97.5 62 C98.5 52 91 45.5 81 46 L77 50.5 C84 51 90.5 55.5 93 65 Z"
          fill={`url(#${id}-plate)`}
          className="equip-doll-plate"
        />
        <path d="M38 136 Q48 138 56.8 138.5 M82 136 Q72 138 63.2 138.5 M25.6 84 H36.6 M94.4 84 H83.4" className="equip-doll-line equip-doll-etch" />
      </>
    )
  }
  return (
    <>
      <g fill={`url(#${id}-plate)`} className="equip-doll-plate">
        {/* legs: greaves, cuisses, tassets */}
        <path d="M41 165.5 L56.2 165.5 L56.3 177 L40.3 177 Z M79 165.5 L63.8 165.5 L63.7 177 L79.7 177 Z" />
        <path d="M38.8 131 L57.4 132 L56 154 L42 154 Z M81.2 131 L62.6 132 L64 154 L78 154 Z" />
        <ellipse cx="49.5" cy="160" rx="7.6" ry="5.6" />
        <ellipse cx="70.5" cy="160" rx="7.6" ry="5.6" />
        <path d="M39.5 108 Q48 112.5 57.5 113.5 L57 130 Q47 130 37.5 126 Z M80.5 108 Q72 112.5 62.5 113.5 L63 130 Q73 130 82.5 126 Z" />
        <path d="M56 112 Q60 113 64 112 L62.5 124 Q60 126 57.5 124 Z" />
        {/* arms: vambraces, elbow cops, rerebraces */}
        <path d="M24.7 94 L34.2 94 L29.5 111 L20.8 111 Z M95.3 94 L85.8 94 L90.5 111 L99.2 111 Z" />
        <path d="M25.5 70 L38 71 L35.8 86 L25.3 86 Z M94.5 70 L82 71 L84.2 86 L94.7 86 Z" />
        <circle cx="30.5" cy="89.5" r="4.8" />
        <circle cx="89.5" cy="89.5" r="4.8" />
        {/* torso: breastplate */}
        <path d="M47 43 Q60 50 73 43 L86 50 C88 58 87 64 84 70 C81 80 80 90 79 101 Q60 107 41 101 C40 90 39 80 36 70 C33 64 32 58 34 50 Z" />
        {/* pauldrons: a domed plate with a lame beneath */}
        <path d="M24 69 C25 62 30 58 37 58 L38.5 63 C32.5 63 29 67 28 73 Z M96 69 C95 62 90 58 83 58 L81.5 63 C87.5 63 91 67 92 73 Z" />
        <path d="M22 62 C21 51 29 44 39 45 L45 50 C37 50 29 55 26.5 66 Z M98 62 C99 51 91 44 81 45 L75 50 C83 50 91 55 93.5 66 Z" />
      </g>
      <path
        d="M60 49 V104 M38 70 Q49 77 60 71 Q71 77 82 70 M39 118 Q48 121.5 57.3 122 M81 118 Q72 121.5 62.7 122 M40 143 H56.8 M80 143 H63.2 M25.4 78 H37 M94.6 78 H83"
        className="equip-doll-line equip-doll-etch"
      />
      <path d="M60 74 L63.5 80 L60 86 L56.5 80 Z" className="equip-doll-emblem" />
      <g className="equip-doll-rivet">
        <circle cx="29" cy="52" r="0.9" />
        <circle cx="91" cy="52" r="0.9" />
        <circle cx="42" cy="111" r="0.8" />
        <circle cx="78" cy="111" r="0.8" />
        <circle cx="49.5" cy="160" r="1.1" />
        <circle cx="70.5" cy="160" r="1.1" />
        <circle cx="30.5" cy="89.5" r="1.1" />
        <circle cx="89.5" cy="89.5" r="1.1" />
      </g>
    </>
  )
}

/** Forms carried in both hands or held upright, which leave no room for a second weapon. */
const LONG_FORMS: readonly (EndeavourWeaponForm | undefined)[] = ['staff', 'polearm', 'bow', 'crossbow']

function isOneHanded(w: { form: EndeavourWeaponForm | undefined; twoHanded: boolean }): boolean {
  return !w.twoHanded && !LONG_FORMS.includes(w.form)
}

/**
 * A weapon in the figure's main hand (at 24/124), roughly to scale with the ~1.8 m figure (220 units).
 * Each is drawn in the hand's own frame — grip at the origin, pointing down along +y — and turned into
 * place: blades and hafts lowered, pointing out and down; staves, polearms and bows held upright.
 * An unknown form is drawn as a sword.
 */
function WeaponFigure({ form = 'sword' }: { form: EndeavourWeaponForm | undefined }) {
  switch (form) {
    case 'dagger':
      return (
        <g transform="translate(22.5 127) rotate(24)">
          <path d="M0 2 V36" className="equip-doll-blade" />
          <path d="M-5 2 H5 M0 2 V-9" className="equip-doll-line" />
        </g>
      )
    case 'axe':
      return (
        <g transform="translate(22.5 126) rotate(26)">
          <path d="M0 -12 V64" className="equip-doll-line equip-doll-haft" />
          <path d="M0 40 L-6 41 C-15 34 -24 38 -25 49 C-25 61 -17 67 -8 62 L0 57 Z" className="equip-doll-fill" />
          <path d="M-22 41 C-25 47 -25 55 -20 61" className="equip-doll-blade equip-doll-edge" />
        </g>
      )
    case 'mace':
      return (
        <g transform="translate(22.5 126) rotate(24)">
          <path d="M0 -10 V52" className="equip-doll-line equip-doll-haft" />
          <path
            d="M-6.5 59 H-10 M6.5 59 H10 M0 65.5 V69 M-4.6 54.4 L-7.2 51.8 M4.6 54.4 L7.2 51.8 M-4.6 63.6 L-7.2 66.2 M4.6 63.6 L7.2 66.2"
            className="equip-doll-line"
          />
          <circle cx="0" cy="59" r="6.5" className="equip-doll-fill" />
        </g>
      )
    case 'staff':
      return (
        <g transform="translate(22 124) rotate(-6)">
          <path d="M0 -92 V82" className="equip-doll-line equip-doll-haft" />
          <path d="M0 -92 C-7 -96 -7 -106 0 -107 C7 -106 7 -97 1 -95" className="equip-doll-line" />
          <circle cx="0" cy="-101" r="2.4" className="equip-doll-gem" />
        </g>
      )
    case 'polearm':
      return (
        <g transform="translate(22 124) rotate(-6)">
          <path d="M0 -95 V82" className="equip-doll-line equip-doll-haft" />
          <path d="M0 -114 L5 -99 L0 -94 L-5 -99 Z" className="equip-doll-fill" />
          <path d="M-4 -93 H4" className="equip-doll-line" />
        </g>
      )
    case 'bow':
      return (
        <g transform="translate(21 124) rotate(-6)">
          <path d="M1.5 -62 V62" className="equip-doll-line equip-doll-string" />
          <path d="M1.5 -62 C-10 -48 -16 -24 -16 0 C-16 24 -10 48 1.5 62" className="equip-doll-line equip-doll-haft" />
          <path d="M-16.5 -6 V6" className="equip-doll-line" />
        </g>
      )
    case 'crossbow':
      return (
        <g transform="translate(23 125) rotate(18)">
          <rect x="-2.4" y="-9" width="4.8" height="44" rx="1.5" className="equip-doll-fill" />
          <path d="M-16 27 Q0 37 16 27" className="equip-doll-line equip-doll-haft" />
          <path d="M-16 27 L0 14 L16 27" className="equip-doll-line equip-doll-string" />
          <path d="M-3.5 35 Q0 41 3.5 35" className="equip-doll-line" />
        </g>
      )
    default:
      return (
        <g transform="translate(22.5 128) rotate(27.7)">
          <path d="M0 0 V87" className="equip-doll-blade" />
          <path d="M-7 0 H7 M0 0 V-14" className="equip-doll-line" />
        </g>
      )
  }
}
