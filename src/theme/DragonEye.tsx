import { usePointerGaze } from './usePointerGaze'

const EYES: [number, number][] = [[100, 60]]

/**
 * A dragon's eye glaring out of the dark (a dragon hoard sprite, see `AmbientLayer`): the golden
 * iris with its slit pupil follows the pointer; placement and the slow blink live in `topics.css`.
 */
export function DragonEye() {
  const { svgRef, pupils } = usePointerGaze({ eyes: EYES, viewBoxWidth: 200, reach: 22 })

  return (
    <svg ref={svgRef} viewBox="0 0 200 120" className="dragon-eye">
      <defs>
        <radialGradient id="dragon-eye-iris">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.35" stopColor="#fbbf24" />
          <stop offset="0.75" stopColor="#ea580c" />
          <stop offset="1" stopColor="#7c2d12" />
        </radialGradient>
        <radialGradient id="dragon-eye-white" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#7a3510" />
          <stop offset="1" stopColor="#1c0a04" />
        </radialGradient>
        <path id="dragon-eye-almond" d="M12 60C50 16 150 16 188 60 150 102 50 102 12 60Z" />
        <clipPath id="dragon-eye-clip">
          <use href="#dragon-eye-almond" />
        </clipPath>
      </defs>

      {/* Scaly brow and cheek ridges around the eye. */}
      <path
        fill="#1e0f08"
        stroke="#f25c1f"
        strokeOpacity="0.45"
        strokeWidth="1.2"
        d="M2 58C36 -2 164 -8 198 46 162 12 44 12 2 58Z"
      />
      <path
        fill="#1e0f08"
        stroke="#f25c1f"
        strokeOpacity="0.3"
        strokeWidth="1"
        d="M10 66C50 112 150 116 192 70 150 98 50 98 10 66Z"
      />
      <path
        d="M34 30q6-8 14-4M62 18q8-7 16-2M96 13q8-6 16 0M130 16q8-4 15 3M160 26q7-2 12 6"
        fill="none"
        stroke="#f25c1f"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      <use href="#dragon-eye-almond" fill="url(#dragon-eye-white)" />
      <g clipPath="url(#dragon-eye-clip)">
        <g
          ref={(el) => {
            pupils.current[0] = el
          }}
          className="dragon-eye-iris"
        >
          <circle cx="100" cy="60" r="36" fill="url(#dragon-eye-iris)" />
          <path d="M100 60m-28 0a28 28 0 0 1 56 0" fill="none" stroke="#fde68a" strokeOpacity="0.35" strokeWidth="1" />
          <ellipse className="dragon-eye-slit" cx="100" cy="60" rx="5" ry="30" fill="#0a0402" />
          <ellipse cx="88" cy="46" rx="6" ry="3.5" fill="#fff" opacity="0.55" transform="rotate(-30 88 46)" />
        </g>
        <rect className="dragon-eye-lid" x="0" y="0" width="200" height="120" fill="#1e0f08" />
      </g>
      <use href="#dragon-eye-almond" fill="none" stroke="#0a0402" strokeWidth="3" />
    </svg>
  )
}
