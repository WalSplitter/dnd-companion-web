/** Mana as a small caption icon: a round flask, half full. Takes the mana colour from `.mana-caption`. */
export function ManaIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="mana-caption size-3.5 shrink-0">
      <circle cx="8" cy="8.5" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.1 9.1q2.4-1.2 4.9 0t4.9 0A4.9 4.9 0 0 1 3.1 9.1Z" fill="currentColor" />
    </svg>
  )
}
