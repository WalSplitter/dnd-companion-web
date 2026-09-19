import type { PropsWithChildren } from 'react'

/** Gilded section heading: diamond, small-caps display title, fading rule. Shared by `Card` and the
 * inventory panels so every framed block on the sheet opens the same way. */
export function SectionTitle({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return (
    <h2 className={`flex items-center gap-2.5 font-display text-[0.8rem] font-bold uppercase tracking-[0.16em] text-trim ${className}`}>
      <span aria-hidden className="size-1.5 shrink-0 rotate-45 bg-trim" />
      <span className="min-w-0 truncate">{children}</span>
      <span aria-hidden className="h-px flex-1 bg-linear-to-r from-trim/50 to-transparent" />
    </h2>
  )
}
