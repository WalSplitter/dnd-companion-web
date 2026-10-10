/** Props for the small line icons on the start page (feature strip, drop hint): 24-unit grid, round strokes. */
const LINE_ICON = { className: 'size-4.5', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function BookIcon() {
  return (
    <svg viewBox="0 0 48 48" className="portal-float size-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 12c-4-3-10-4-17-3v27c7-1 13 0 17 3 4-3 10-4 17-3V9c-7-1-13 0-17 3Z" fill="color-mix(in srgb, currentColor 12%, transparent)" />
      <path d="M24 12v27" />
      <path className="book-mark" d="M31 10v12l3-2.5 3 2.5V9.4" fill="currentColor" />
    </svg>
  )
}

export function ChestIcon() {
  return (
    <svg viewBox="0 0 48 48" className="portal-float size-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <rect x="7" y="22" width="34" height="18" rx="2" fill="color-mix(in srgb, currentColor 12%, transparent)" />
      <path d="M7 30h34M24 26v8" />
      <circle className="chest-keyhole" cx="24" cy="30" r="2.6" fill="currentColor" stroke="none" />
      <g className="chest-lid">
        <path d="M7 22v-4a10 8 0 0 1 10-8h14a10 8 0 0 1 10 8v4Z" fill="color-mix(in srgb, currentColor 18%, transparent)" />
        <path d="M17 10v12M31 10v12" strokeOpacity="0.6" />
      </g>
      <g className="chest-glow" stroke="none" fill="currentColor">
        <circle cx="16" cy="16" r="1.2" />
        <circle cx="24" cy="12" r="1.5" />
        <circle cx="32" cy="15" r="1.1" />
      </g>
    </svg>
  )
}

export function RepoIcon() {
  return (
    <svg viewBox="0 0 48 48" className="portal-float size-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M15 15v18M33 21c0 9-18 6-18 12" />
      <circle cx="15" cy="11" r="4" fill="color-mix(in srgb, currentColor 18%, transparent)" />
      <circle cx="15" cy="37" r="4" fill="color-mix(in srgb, currentColor 18%, transparent)" />
      <circle cx="33" cy="17" r="4" fill="currentColor" />
    </svg>
  )
}

export function PartyIcon() {
  return (
    <svg viewBox="0 0 48 48" className="portal-float size-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="13" cy="17" r="4" strokeOpacity="0.6" />
      <circle cx="35" cy="17" r="4" strokeOpacity="0.6" />
      <path d="M5 36c0-5 3.5-9 8-9 2 0 3.8.8 5.2 2M43 36c0-5-3.5-9-8-9-2 0-3.8.8-5.2 2" strokeOpacity="0.6" />
      <circle cx="24" cy="14" r="5" fill="color-mix(in srgb, currentColor 18%, transparent)" />
      <path d="M14 39c0-7 4.5-12 10-12s10 5 10 12Z" fill="color-mix(in srgb, currentColor 12%, transparent)" />
    </svg>
  )
}

/** Arrow into a tray — "drop a folder here". */
export function DropIcon() {
  return (
    <svg {...LINE_ICON} className="size-4 text-primary">
      <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

export function LockIcon() {
  return (
    <svg {...LINE_ICON}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function QuillIcon() {
  return (
    <svg {...LINE_ICON}>
      <path d="M20 4c-6 1-11 6-13 13l-2 3 3-2c7-2 12-7 12-14Z" />
      <path d="M7 17 13 11" />
    </svg>
  )
}

export function LinkIcon() {
  return (
    <svg {...LINE_ICON}>
      <path d="M9 7H7a5 5 0 0 0 0 10h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" />
    </svg>
  )
}

export function PaletteIcon() {
  return (
    <svg {...LINE_ICON}>
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-1.2-1-1.4-1-2.4 0-.9.7-1.5 1.6-1.5H16a5 5 0 0 0 5-5c0-4.2-4-7.5-9-7.5Z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" />
      <circle cx="10" cy="7" r="1" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1" fill="currentColor" />
    </svg>
  )
}
