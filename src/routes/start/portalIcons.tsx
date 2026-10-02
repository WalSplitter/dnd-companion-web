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
