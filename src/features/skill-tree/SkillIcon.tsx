import type { ReactNode } from 'react'
import type { SkillIcon as SkillIconName } from './skillIconKeys'

/** Line glyphs on a 24 grid, drawn in `currentColor` like the app's other icons. */
const PATHS: Record<SkillIconName, ReactNode> = {
  // Signpost: a fork in the road
  choice: (
    <>
      <path d="M12 3v18M9 21h6" />
      <path d="M12 5h6l2 2-2 2h-6M12 11H6l-2 2 2 2h6" />
    </>
  ),
  attribute: (
    <>
      <path d="M12 19V6M7 11l5-5 5 5" />
      <path d="M8 20.5h8" />
    </>
  ),
  crown: (
    <>
      <path d="M4 17.5h16l1-10-5 3.5-4-6.5-4 6.5L3 7.5z" />
      <path d="M5 20.5h14" />
    </>
  ),
  skull: (
    <>
      <path d="M12 3a7 7 0 0 0-7 7c0 2.4 1.2 4.1 2.5 5v2.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V15c1.3-.9 2.5-2.6 2.5-5a7 7 0 0 0-7-7z" />
      <circle cx="9.3" cy="10.8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="10.8" r="1.4" fill="currentColor" stroke="none" />
      <path d="M10.5 18.5v2M13.5 18.5v2" />
    </>
  ),
  mask: (
    <>
      <path d="M3 8.5c3-1.6 6-1.6 9 0 3-1.6 6-1.6 9 0 0 5-2 9-5 9-2 0-3-2-4-2s-2 2-4 2c-3 0-5-4-5-9z" />
      <path d="M6.8 11.6l2.8.9M17.2 11.6l-2.8.9" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  bow: (
    <>
      <path d="M6 3.5c8 .5 14 6.5 14.5 14.5" />
      <path d="M6 3.5l14.5 14.5" strokeDasharray="1.5 2" />
      <path d="M3.5 20.5l11-11M3.5 20.5h3.5M3.5 20.5V17" />
    </>
  ),
  flame: <path d="M12 2.5c1.2 4 5.5 5.5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.6 1.5-3.8 2.6-5.3.4 1.5 1.3 2.3 2.4 2.3 0-2.7-1.2-4.6.5-7.5z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </>
  ),
  heart: (
    <>
      <path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z" />
      <path d="M12 11v4.5M9.8 13.2h4.4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.8l7.5 3v5.5c0 4.6-3.2 8.3-7.5 10-4.3-1.7-7.5-5.4-7.5-10V5.8z" />
      <path d="M12 6.5v11.5" opacity="0.6" />
    </>
  ),
  spirit: (
    <>
      <path d="M6 20.5V10a6 6 0 0 1 12 0v10.5l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6z" />
      <circle cx="9.8" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  magic: (
    <>
      <path d="M11 3l1.7 5.1 5.3 1.9-5.3 1.9L11 17l-1.7-5.1L4 10l5.3-1.9z" />
      <path d="M18 15l.7 1.8 1.8.7-1.8.7L18 20l-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.5 6.2-9.5 6.2S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8.5h10.5a3 3 0 1 0-3-3" />
      <path d="M3 12.5h15a3 3 0 1 1-3 3" />
      <path d="M3 16.5h6" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19.5C5 11 10 5 20 4.5c0 10-6 15-14.5 15z" />
      <path d="M5 19.5l8.5-8.5" />
    </>
  ),
  paw: (
    <>
      <circle cx="8" cy="8.8" r="1.6" />
      <circle cx="12" cy="6.6" r="1.6" />
      <circle cx="16" cy="8.8" r="1.6" />
      <circle cx="5.9" cy="13" r="1.4" />
      <circle cx="18.1" cy="13" r="1.4" />
      <path d="M12 12c-3 0-5 3.2-5 5.3 0 1.5 1.4 2.4 2.9 2 1-.3 1.4-.5 2.1-.5s1.1.2 2.1.5c1.5.4 2.9-.5 2.9-2C17 15.2 15 12 12 12z" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  book: (
    <>
      <path d="M3 5.5c3-1 6-.8 9 1.2 3-2 6-2.2 9-1.2V19c-3-1-6-.8-9 1.2-3-2-6-2.2-9-1.2z" />
      <path d="M12 6.7v13.5" />
    </>
  ),
  sword: (
    <>
      <path d="M20 4l-9.5 9.5M20 4h-4M20 4v4" />
      <path d="M7 12.5l4.5 4.5M9.2 14.8L4 20" />
    </>
  ),
  bolt: <path d="M13.5 2.5L5.5 13.5h6l-1 8 8-11h-6z" />,
  rune: (
    <>
      <path d="M12 3l7 9-7 9-7-9z" />
      <path d="M12 8v8M9.5 10.5l5 3" />
    </>
  ),
}

export function SkillIcon({ name, className = 'size-5' }: { name: SkillIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  )
}
