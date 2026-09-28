import { usePointerGaze } from './usePointerGaze'

/** Socket centres in the skull's viewBox, and how far (in viewBox units) the glowing pupils roam. */
const EYES: [number, number][] = [
  [66, 120],
  [134, 120],
]
const PUPIL_REACH = 8

/**
 * A small metal skull resting in a corner of the necromancer's tomb world (a sprite, see
 * `AmbientLayer`). Its glowing pupils follow the pointer and the head tilts a touch towards it;
 * its placement and the occasional jaw chatter live in `topics.css`.
 */
export function WatchingSkull() {
  const { svgRef, pupils } = usePointerGaze({ eyes: EYES, viewBoxWidth: 200, reach: PUPIL_REACH, tilt: 3 })

  return (
    <svg ref={svgRef} viewBox="0 0 200 260" className="watching-skull">
      <defs>
        <radialGradient id="watching-skull-bone" cx="0.5" cy="0.32" r="0.72">
          <stop offset="0" stopColor="#e6ecea" />
          <stop offset="0.55" stopColor="#aab5b2" />
          <stop offset="1" stopColor="#5f6b68" />
        </radialGradient>
        <radialGradient id="watching-skull-glow">
          <stop offset="0" stopColor="#eafff1" />
          <stop offset="0.18" stopColor="#9dffc0" />
          <stop offset="0.45" stopColor="#52f08a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#52f08a" stopOpacity="0" />
        </radialGradient>
        <path
          id="watching-skull-socket-l"
          d="M88 104C78 95 52 96 42 106C35 114 38 131 48 137C59 143 78 142 86 134C94 126 94 111 88 104Z"
        />
        <path
          id="watching-skull-socket-r"
          d="M112 104C122 95 148 96 158 106C165 114 162 131 152 137C141 143 122 142 114 134C106 126 106 111 112 104Z"
        />
        <clipPath id="watching-skull-clip-l">
          <use href="#watching-skull-socket-l" />
        </clipPath>
        <clipPath id="watching-skull-clip-r">
          <use href="#watching-skull-socket-r" />
        </clipPath>
      </defs>

      <g className="watching-skull-bone">
        <path d="M56 192h88v28H56Z" fill="#050707" />
        {/* The lower jaw with its teeth, so it can chatter on its own. */}
        <g className="watching-skull-jaw">
          <path
            fill="url(#watching-skull-bone)"
            stroke="#2b3331"
            strokeWidth="1.4"
            d="M100 214C114 214 128 212 140 206C146 200 152 182 154 166C159 164 164 172 163 184C161 202 157 218 149 230C141 242 122 249 100 249C78 249 59 242 51 230C43 218 39 202 37 184C36 172 41 164 46 166C48 182 54 200 60 206C72 212 86 214 100 214Z"
          />
          <g fill="#d9dfdc" stroke="#3a4442" strokeWidth="0.8">
            <rect x="100" y="208" width="7.7" height="13" rx="2" />
            <rect x="91.5" y="208" width="7.7" height="13" rx="2" />
            <rect x="108.5" y="209" width="7.2" height="12" rx="2" />
            <rect x="83.5" y="209" width="7.2" height="12" rx="2" />
            <rect x="116.5" y="207" width="7.2" height="14" rx="2" />
            <rect x="75.5" y="207" width="7.2" height="14" rx="2" />
            <rect x="124.5" y="210" width="7.2" height="11" rx="2" />
            <rect x="67.5" y="210" width="7.2" height="11" rx="2" />
            <rect x="132.5" y="211" width="7.2" height="10" rx="2" />
            <rect x="59.5" y="211" width="7.2" height="10" rx="2" />
          </g>
        </g>
        <path
          fill="url(#watching-skull-bone)"
          stroke="#2b3331"
          strokeWidth="1.4"
          d="M100 6C150 6 182 38 184 86C185 108 180 124 170 134C178 136 187 146 185 158C183 168 173 172 165 168C161 178 155 188 146 194C132 199 116 200 100 200C84 200 68 199 54 194C45 188 39 178 35 168C27 172 17 168 15 158C13 146 22 136 30 134C20 124 15 108 16 86C18 38 50 6 100 6Z"
        />
        <g fill="#d9dfdc" stroke="#3a4442" strokeWidth="0.8">
          <rect x="100" y="189" width="8.2" height="15" rx="2" />
          <rect x="91" y="189" width="8.2" height="15" rx="2" />
          <rect x="109" y="189" width="7.7" height="14" rx="2" />
          <rect x="82.5" y="189" width="7.7" height="14" rx="2" />
          <rect x="117.5" y="189" width="7.2" height="17" rx="2" />
          <rect x="74.5" y="189" width="7.2" height="17" rx="2" />
          <rect x="125.5" y="189" width="7.2" height="12" rx="2" />
          <rect x="66.5" y="189" width="7.2" height="12" rx="2" />
          <rect x="133.5" y="189" width="7.2" height="11" rx="2" />
          <rect x="58.5" y="189" width="7.2" height="11" rx="2" />
        </g>
        {/* Temples, cheekbones, brow ridges and jaw, shaded like a pencil sketch. */}
        <g fill="#1d2423" opacity="0.4">
          <path d="M172 132C163 127 157 114 160 98C166 111 170 121 172 132Z" />
          <path d="M28 132C37 127 43 114 40 98C34 111 30 121 28 132Z" />
          <path d="M160 170C150 172 142 179 139 191C146 184 154 178 160 170Z" />
          <path d="M40 170C50 172 58 179 61 191C54 184 46 178 40 170Z" />
          <path d="M112 101C124 92 150 92 162 104C150 97 126 96 112 101Z" />
          <path d="M88 101C76 92 50 92 38 104C50 97 74 96 88 101Z" />
          <path d="M150 140C146 150 138 156 128 158C138 152 144 148 150 140Z" />
          <path d="M50 140C54 150 62 156 72 158C62 152 56 148 50 140Z" />
          <path d="M150 214C148 226 140 236 128 242C138 232 146 224 150 214Z" />
          <path d="M50 214C52 226 60 236 72 242C62 232 54 224 50 214Z" />
        </g>
        <path
          d="M100 146C94 146 88 162 90 174C92 180 98 178 100 172C102 178 108 180 110 174C112 162 106 146 100 146Z"
          fill="#050707"
        />
        <path
          d="M118 14l-6 20 8 14-10 18M112 34l-10 4M64 40l10 12-4 12M142 150l8 10"
          fill="none"
          stroke="#2b3331"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.8"
        />
        <use href="#watching-skull-socket-l" fill="#040606" />
        <use href="#watching-skull-socket-r" fill="#040606" />
      </g>

      {/* A glow deep inside each socket that follows the pointer. */}
      {EYES.map(([cx, cy], i) => (
        <g key={cx} clipPath={`url(#watching-skull-clip-${i === 0 ? 'l' : 'r'})`}>
          <g
            ref={(el) => {
              pupils.current[i] = el
            }}
            className="watching-skull-pupil"
          >
            <g className="watching-skull-eye" style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx} cy={cy} r="20" fill="url(#watching-skull-glow)" />
              <circle cx={cx} cy={cy} r="3.5" fill="#eafff1" />
            </g>
          </g>
        </g>
      ))}
    </svg>
  )
}
