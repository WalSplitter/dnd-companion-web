/** Ki (and other class resources) as a small caption icon: a two-tailed swirl. Takes its colour from `.ki-caption`. */
export function KiIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="ki-caption size-3.5 shrink-0">
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 1.8a3.1 3.1 0 0 1 0 6.2 3.1 3.1 0 0 0 0 6.2A6.2 6.2 0 0 1 8 1.8Z" fill="currentColor" />
    </svg>
  )
}
