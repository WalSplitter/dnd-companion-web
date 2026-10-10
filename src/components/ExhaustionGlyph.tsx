/** A blood drop, or for the last level (death) a skull. */
export function ExhaustionGlyph({ skull }: { skull: boolean }) {
  return skull ? (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
      <path
        d="M12 2.5c-5 0-8.5 3.4-8.5 8 0 2.6 1.2 4.6 3 5.8V19a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 17.5 19v-2.7c1.8-1.2 3-3.2 3-5.8 0-4.6-3.5-8-8.5-8Z"
        fill="currentColor"
      />
      <circle cx="8.6" cy="11.2" r="2.1" className="exh-eye" />
      <circle cx="15.4" cy="11.2" r="2.1" className="exh-eye" />
      <path d="M12 13.6 10.9 15.8h2.2Z" className="exh-eye" />
      <path d="M9.5 18v2.2M12 18v2.2M14.5 18v2.2" stroke="var(--color-surface)" strokeWidth="1.1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
      <path d="M12 2.5C9 7.2 5.5 10.8 5.5 14.8a6.5 6.5 0 0 0 13 0c0-4-3.5-7.6-6.5-12.3Z" fill="currentColor" />
      <path d="M9.2 13.6c-.5 1.6.1 3.4 1.6 4.1" fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="1.3" strokeLinecap="round" className="exh-shine" />
    </svg>
  )
}
