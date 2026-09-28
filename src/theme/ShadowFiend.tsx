import { usePointerGaze } from './usePointerGaze'

const EYES: [number, number][] = [
  [190, 148],
  [211, 148],
]

/**
 * A shadow fiend looming out of the fog (the shadow master's sprite, see `AmbientLayer`): a body of
 * smoke with ragged edges (turbulence displacement), clawed arms reaching out and ice-blue eyes that
 * follow the pointer. Placement, breathing and the reaching arms live in `topics.css`.
 */
export function ShadowFiend() {
  const { svgRef, pupils } = usePointerGaze({ eyes: EYES, viewBoxWidth: 400, reach: 2.5 })

  return (
    <svg ref={svgRef} viewBox="0 0 400 500" className="shadow-fiend">
      <defs>
        <radialGradient id="shadow-fiend-fog" cx="0.5" cy="0.42" r="0.5">
          <stop offset="0" stopColor="#bdb8d4" stopOpacity="0.42" />
          <stop offset="0.55" stopColor="#8a84a0" stopOpacity="0.16" />
          <stop offset="1" stopColor="#8a84a0" stopOpacity="0" />
        </radialGradient>
        <filter id="shadow-fiend-mass" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="shadow-fiend-churn" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="28" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="shadow-fiend-smoke" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
        <filter id="shadow-fiend-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse className="shadow-fiend-fog" cx="200" cy="220" rx="220" ry="250" fill="url(#shadow-fiend-fog)" />

      {/* Volume: heavy, blurred smoke behind everything. */}
      <g filter="url(#shadow-fiend-mass)" fill="#020104" opacity="0.9">
        <ellipse cx="200" cy="200" rx="115" ry="80" />
        <ellipse cx="200" cy="310" rx="70" ry="115" />
        <ellipse cx="200" cy="430" rx="95" ry="60" opacity="0.7" />
      </g>

      {/* A wild mane of smoke around the head, streams off the shoulders, a frayed lower body. */}
      <g filter="url(#shadow-fiend-churn)" fill="none" stroke="#020104" strokeLinecap="round" opacity="0.9">
        <path d="M200 118C196 80 214 60 204 24" strokeWidth="14" />
        <path d="M186 122C168 90 170 64 146 40" strokeWidth="12" />
        <path d="M214 122C236 92 240 66 262 44" strokeWidth="12" />
        <path d="M176 136C146 124 130 100 104 96" strokeWidth="10" />
        <path d="M226 136C256 124 272 104 298 100" strokeWidth="10" />
        <path d="M172 160C140 160 120 146 96 150" strokeWidth="8" />
        <path d="M230 160C262 160 282 148 306 152" strokeWidth="8" />
        <path d="M130 210C100 190 80 170 50 176" strokeWidth="12" />
        <path d="M270 210C300 190 322 170 352 176" strokeWidth="12" />
        <path d="M180 360C160 410 176 450 150 500" strokeWidth="16" />
        <path d="M220 360C240 410 226 452 252 500" strokeWidth="14" />
        <path d="M200 380C204 430 190 460 204 500" strokeWidth="12" />
        <path d="M160 330C120 370 100 420 64 450" strokeWidth="10" />
        <path d="M240 330C280 370 300 414 336 446" strokeWidth="10" />
      </g>

      {/* Head and hunched body. */}
      <g filter="url(#shadow-fiend-smoke)" fill="#020104">
        <path d="M200 112C222 112 234 132 232 152 230 172 216 186 200 188 184 186 170 172 168 152 166 132 178 112 200 112Z" />
        <path d="M96 262C100 204 146 176 200 180 254 176 300 204 304 262 284 252 262 250 248 262 246 310 232 350 200 400 168 350 154 310 152 262 138 250 116 252 96 262Z" />
      </g>

      {/* One arm reaching down at you, the other raised, hooked claws; each smoked on its own so only
          they re-render while they reach. */}
      <g className="shadow-fiend-arm-l" filter="url(#shadow-fiend-smoke)" fill="#020104">
        <path d="M118 230C92 246 72 272 62 304 54 330 46 350 38 366L56 374C62 356 72 334 82 312 94 284 112 262 136 250Z" />
        <path d="M36 360C28 368 28 382 36 388 46 392 58 386 60 374Z" />
        <path d="M34 384C22 398 16 416 18 440 22 420 30 404 42 392Z" />
        <path d="M42 388C38 406 40 424 50 444 48 422 48 406 52 392Z" />
        <path d="M52 386C60 402 70 414 86 422 72 408 64 398 60 384Z" />
        <path d="M34 372C20 372 8 380 0 392 12 386 24 382 36 380Z" />
      </g>
      <g className="shadow-fiend-arm-r" filter="url(#shadow-fiend-smoke)" fill="#020104">
        <path d="M276 232C304 218 324 200 336 178 346 160 350 146 352 130L370 134C368 152 362 170 352 188 336 214 312 236 290 252Z" />
        <path d="M350 134C348 120 356 110 368 110 378 112 382 124 376 134Z" />
        <path d="M354 118C348 100 348 82 356 62 356 82 358 98 364 112Z" />
        <path d="M362 112C364 92 372 76 386 64 378 80 374 96 372 114Z" />
        <path d="M370 116C384 104 398 98 414 98 400 104 388 112 378 124Z" />
        <path d="M348 128C334 122 324 112 318 98 328 108 338 116 352 120Z" />
      </g>

      {/* Ice-blue eyes that follow the pointer. */}
      <g filter="url(#shadow-fiend-glow)">
        {EYES.map(([cx, cy], i) => (
          <g
            key={cx}
            ref={(el) => {
              pupils.current[i] = el
            }}
            className="shadow-fiend-eye"
          >
            {/* Both slant down towards the nose: the right eye is the left one mirrored. */}
            <path
              d={`M${cx - 6} ${cy}Q${cx} ${cy - 4} ${cx + 6} ${cy + 1}Q${cx} ${cy + 3} ${cx - 6} ${cy}Z`}
              transform={i === 1 ? `translate(${2 * cx} 0) scale(-1 1)` : undefined}
              fill="#dff3ff"
            />
          </g>
        ))}
      </g>
    </svg>
  )
}
