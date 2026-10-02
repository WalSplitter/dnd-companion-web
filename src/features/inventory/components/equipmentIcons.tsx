import type { ReactNode } from 'react'
import type { EndeavourWeaponForm } from '../../../vault/adapters/endeavourItem'

export function ArmorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M8 3 4 5.5l1 5.5h2.2V20c3.2 1.4 6.4 1.4 9.6 0v-9h2.2l1-5.5L16 3c-1.2 1.6-2.5 2.3-4 2.3S9.2 4.6 8 3Z" />
      <path d="M12 5.5V19M8.5 11.5c2.3 1 4.7 1 7 0" strokeLinecap="round" />
    </svg>
  )
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3 19 5.8V11c0 4.6-3 8-7 10-4-2-7-5.4-7-10V5.8Z" />
      <path d="M12 6.5V18M7.5 11h9" strokeLinecap="round" />
    </svg>
  )
}

export function SwordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 4h-4.5L7 12.5 11.5 17 20 8.5Z" />
      <path d="m5.5 11 7.5 7.5M8 16l-4 4" />
    </svg>
  )
}

/** The icon for a weapon's form (see `WeaponFigure`); a sword when the form is unknown. */
const WEAPON_ICON_PATHS: Record<EndeavourWeaponForm, ReactNode> = {
  sword: <path d="M20 4h-4.5L7 12.5 11.5 17 20 8.5ZM5.5 11l7.5 7.5M8 16l-4 4" />,
  dagger: <path d="M19.5 4.5H16l-5.5 5.5 3.5 3.5L19.5 8ZM8.5 9.5l6 6M11 13l-5 5" />,
  axe: <path d="M3.5 20.5 15 9M11 6.5c2.5-3.5 7.5-4 9.5-1.5s1.5 7-2 9.5Z" />,
  mace: (
    <>
      <path d="M4.5 19.5 12.5 11.5" />
      <circle cx="15" cy="9" r="3.5" />
      <path d="M15 3.5V5M20.5 9H19M19 5l-1 1M11 5l1 1M19 13l-1-1" />
    </>
  ),
  staff: (
    <>
      <path d="M5 20.5 16.5 7" />
      <circle cx="18" cy="5" r="2.3" />
    </>
  ),
  polearm: <path d="M4.5 19.5 14 10M14 10l1.5-4.5L20 4l-1.5 4.5ZM11.5 9.5l3 3" />,
  bow: <path d="M8 3c5 3 7 6 7 9s-2 6-7 9M8 3v18M4 12h14M15.5 9.5 18 12l-2.5 2.5" />,
  crossbow: <path d="M12 6v15M4 9.5C6.5 7.5 9.2 6.5 12 6.5s5.5 1 8 3M4 9.5l8 4 8-4M12 17.5H9.5" />,
}

export function WeaponIcon({ form = 'sword', className }: { form: EndeavourWeaponForm | undefined; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {WEAPON_ICON_PATHS[form]}
    </svg>
  )
}

export function HeadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 15.5C4.5 8.5 7.8 3.5 12 3.5s7.5 5 7.5 12v3.5c-2.2-.9-4.6-1.2-6.3-1.1V21h-2.4v-3.1c-1.7-.1-4.1.2-6.3 1.1Z" />
      <path d="M5 11.5c4.6-1.6 9.4-1.6 14 0M12 3.5v6M8 14h2.5M13.5 14H16" />
    </svg>
  )
}

export function BeltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 9.5h19v5h-19Z" />
      <rect x="9" y="7.5" width="6" height="9" rx="1" />
      <path d="M12 12h3M18 9.5v5" />
    </svg>
  )
}

export function CloakIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 3.5c1.2 1 2.5 1.5 4 1.5s2.8-.5 4-1.5c1 5.5 2.5 11 4.5 16.5-2 1-4 1-6 .3-1.6.8-3.4.8-5 0-2 .7-4 .7-6-.3C5.5 14.5 7 9 8 3.5Z" />
      <path d="M12 5v15M9.5 9 8 19M14.5 9l1.5 10" />
      <circle cx="12" cy="6.5" r="1" />
    </svg>
  )
}

export function GlovesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 21v-5.5l-2.6-3.6a1.5 1.5 0 0 1 2.4-1.8L8.5 12V5a1.25 1.25 0 0 1 2.5 0V4a1.25 1.25 0 0 1 2.5 0v1a1.25 1.25 0 0 1 2.5 0v2a1.25 1.25 0 0 1 2.5 0v8c0 3.3-2.3 6-5.5 6Z" />
      <path d="M11 5v6M13.5 5v6M16 7v4.5M7 18.5h11" />
    </svg>
  )
}

export function BootsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 3h6v10.5l5.2 2.7a3 3 0 0 1 1.8 2.7V21H5a1 1 0 0 1-1-1v-4.5L8 13Z" />
      <path d="M8 7h6M8 10h6M4 18h17" />
    </svg>
  )
}

export function NecklaceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 3c0 6 3.5 10 7 11 3.5-1 7-5 7-11" strokeDasharray="0.1 2.4" strokeWidth="2" />
      <path d="M12 14l-2.5 3 2.5 4 2.5-4Z" />
    </svg>
  )
}

export function RingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="15" r="5.5" />
      <path d="M9.5 7.5 12 4l2.5 3.5L12 9.5Z" />
    </svg>
  )
}

export function UnequipIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
      <path d="M8 2.5v7M5 6.5l3 3 3-3M3 11.5v2h10v-2" />
    </svg>
  )
}
