import type { ReactNode } from 'react'

/**
 * Icons that say who rolls what, shared by weapon attacks and spells: the player's attack roll
 * (crosshair, trim), the damage roll (impact burst, orange), the DM's saving throw for the targets
 * (hooded eye, violet) and a spell that simply hits (four-point star, accent).
 */

/** The default roll-button look, laid out for an icon in front of the value. */
export const ROLL_BUTTON =
  'inline-flex cursor-pointer items-center gap-1 rounded-md border border-trim/30 bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-fg-muted transition hover:border-trim hover:text-trim hover:shadow-[0_0_10px_-3px_var(--color-trim)]'

/** Crosshair: the attack roll decides whether you hit. */
export function HitIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-trim" aria-hidden>
      <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1v3.5M8 11.5V15M1 8h3.5M11.5 8H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    </svg>
  )
}

/** Impact burst: the damage roll says how hard it lands. */
export function ImpactIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-orange-400" aria-hidden>
      <path fill="currentColor" d="m8 .8 1.5 4.3 4.3-1.6-2.4 3.9 3.8 2.3-4.5.4.6 4.5L8 11.3l-3.3 3.3.6-4.5-4.5-.4 3.8-2.3-2.4-3.9 4.3 1.6Z" />
    </svg>
  )
}

/** Outline and facet lines of each die, on a 16×16 grid — the shapes Nimble prints before damage. */
const DIE_SHAPES: Record<number, { body: string; facets: string }> = {
  4: { body: 'M8 1.2 14.8 13.8H1.2Z', facets: 'M8 1.2v8.3M8 9.5 1.2 13.8M8 9.5l6.8 4.3' },
  6: { body: 'M2.5 2.5h11v11h-11Z', facets: 'M2.5 2.5 5 5h6l2.5-2.5M5 5v6h6V5M5 11l-2.5 2.5M11 11l2.5 2.5' },
  8: { body: 'M8 .8 14.8 8 8 15.2 1.2 8Z', facets: 'M1.2 8h13.6M8 .8 5 8l3 7.2 3-7.2Z' },
  10: { body: 'M8 .8 14.8 7 8 15.2 1.2 7Z', facets: 'M8 .8 5 8.4 8 10l3-1.6ZM1.2 7 5 8.4M14.8 7 11 8.4M8 10v5.2' },
  12: { body: 'M8 .8 14.9 5.8 12.3 14H3.7L1.1 5.8Z', facets: 'M8 3.6 11.2 6l-1.2 4H6L4.8 6ZM8 .8v2.8M14.9 5.8 11.2 6M12.3 14 10 10M3.7 14 6 10M1.1 5.8 4.8 6' },
  20: { body: 'M8 .6 14.5 4.3v7.4L8 15.4 1.5 11.7V4.3Z', facets: 'M8 3.8 12 10.8H4ZM8 .6v3.2M14.5 4.3 12 10.8M1.5 4.3 4 10.8M8 15.4 4 10.8M8 15.4l4-4.6' },
}

/** Largest die in a formula (`4d12+1d6` → 12), or undefined when it rolls none. */
function mainDie(formula: string): number | undefined {
  const sides = [...formula.matchAll(/\d*[dw](\d+)/gi)].map((m) => Number(m[1]))
  return sides.length > 0 ? Math.max(...sides) : undefined
}

/**
 * The die a damage roll uses, drawn in its own shape (d4 triangle, d10 kite, d12 pentagon, …) in
 * the damage orange. Any other die size falls back to the impact burst.
 */
export function DieIcon({ formula }: { formula: string }) {
  const sides = mainDie(formula)
  const shape = sides !== undefined ? DIE_SHAPES[sides] : undefined
  if (!shape) return <ImpactIcon />
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-orange-400" aria-hidden>
      <path d={shape.body} fill="color-mix(in srgb, currentColor 30%, transparent)" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d={shape.facets} fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  )
}

/** A watchful eye under a hood: the DM rolls this one, for the targets. */
export function DmIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-violet-400" aria-hidden>
      <path d="M1.5 9C3 5.8 5.3 4.2 8 4.2s5 1.6 6.5 4.8C13 12.2 10.7 13.8 8 13.8S3 12.2 1.5 9Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="8" cy="9" r="2.2" fill="currentColor" />
      <path d="M3 3.6 8 1.5l5 2.1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Four-point star: the spell hits without any roll to see if it does. */
export function AutoHitIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0 text-accent" aria-hidden>
      <path fill="currentColor" d="M8 .8 9.6 6.4 15.2 8 9.6 9.6 8 15.2 6.4 9.6.8 8l5.6-1.6Z" />
    </svg>
  )
}

/** Concentric rings: the spell covers an area. */
export function AreaIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3 shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.2 1.6" />
      <circle cx="8" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    </svg>
  )
}

/** Thin chevron between two steps of a roll sequence. */
export function StepArrow() {
  return (
    <svg viewBox="0 0 8 12" className="mt-1.5 h-2.5 w-2 shrink-0 text-fg-muted/60" aria-hidden>
      <path d="m2 2 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A roll button with a tiny caption underneath, so attack and damage read apart at a glance. */
export function CaptionedRoll({ caption, children, className = 'text-fg-muted' }: { caption: string; children: ReactNode; className?: string }) {
  return (
    <span className="flex flex-col items-center gap-0.5">
      {children}
      <span className={`whitespace-nowrap text-[0.55rem] font-semibold uppercase leading-none tracking-wider ${className}`}>{caption}</span>
    </span>
  )
}
