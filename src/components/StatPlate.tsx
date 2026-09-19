import type { ReactNode } from 'react'

/** Engraved plate showing one headline number with a small caption underneath. Pass `children`
 * for a value that's a roll button; otherwise `value` renders as plain text. */
export function StatPlate({ label, value, children, className = '' }: { label: string; value?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={`rpg-plate flex min-w-[4.5rem] flex-col items-center justify-center px-3 py-2 text-center ${className}`}>
      <span className="font-num text-xl leading-tight text-fg">{children ?? value}</span>
      <span className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted">{label}</span>
    </div>
  )
}
