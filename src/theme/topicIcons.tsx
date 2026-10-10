import type { ReactNode } from 'react'

export type IconProps = { className?: string }

function Icon({ className = 'h-4 w-4', children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function SkullIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3a7 7 0 0 0-7 7c0 2.4 1.2 4.1 2.5 5v2.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V15c1.3-.9 2.5-2.6 2.5-5a7 7 0 0 0-7-7z" />
      <circle cx="9.3" cy="10.8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="10.8" r="1.5" fill="currentColor" stroke="none" />
      <path d="M10.5 18.5v2.5M13.5 18.5v2.5" />
    </Icon>
  )
}

export function DragonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 15c2-4.5 6-7 10.5-7L17 4l.5 4 4 1-3 2.5c.8 2.2.2 4.5-1.8 6H9.5L7 20l-1-3.5C4 16.5 3 16 3 15z" />
      <circle cx="14.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <path d="M8 14.5c2 .4 4 .3 6-.5" />
    </Icon>
  )
}

export function PumpkinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 7c-5 0-8 2.8-8 6.5S7 20 12 20s8-2.8 8-6.5S17 7 12 7z" />
      <path d="M12 7c-2 1.6-2.6 4-2.6 6.5S10 18.4 12 20M12 7c2 1.6 2.6 4 2.6 6.5S14 18.4 12 20" />
      <path d="M12 7V4.5c0-.6.4-1 1-1h1" />
    </Icon>
  )
}

export function CastleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 21V5h2.5v2h2V5H10v6h4V5h2.5v2h2V5H21v16z" strokeLinejoin="miter" />
      <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
    </Icon>
  )
}

export function HornIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 21L12 3l2.5 18z" />
      <path d="M10.1 17l4.1-1.3M10.7 12.6l2.9-.9M11.3 8.3l1.6-.5" />
      <path d="M18 5l.5 1.5L20 7l-1.5.5L18 9l-.5-1.5L16 7l1.5-.5z" />
    </Icon>
  )
}

export function FirTreeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l5 6h-3l4 5h-3l4 5H5l4-5H6l4-5H7z" />
      <path d="M12 19v2.5" />
    </Icon>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </Icon>
  )
}

export function BlossomIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="7.6" r="3" />
      <circle cx="16.2" cy="10.6" r="3" />
      <circle cx="14.6" cy="15.6" r="3" />
      <circle cx="9.4" cy="15.6" r="3" />
      <circle cx="7.8" cy="10.6" r="3" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function ShellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20.5L3.5 11a8.5 8.5 0 0 1 17 0z" />
      <path d="M12 20.5L7 6.2M12 20.5V3.5M12 20.5L17 6.2" />
      <path d="M10 20.5h4" />
    </Icon>
  )
}

export function PlanetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="5.5" />
      <path d="M7.4 9.6C3.6 11.4 1.6 13.4 2.3 14.6c1 1.8 7.2.5 13.6-3S22.6 5.2 21.7 3.6c-.5-.9-2.3-.8-4.8.2" />
      <path d="M19 18.5l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" />
    </Icon>
  )
}

export function SnowflakeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5" />
      <path d="M9.5 3.8L12 6.3l2.5-2.5M9.5 20.2l2.5-2.5 2.5 2.5M3.4 10.7l3.4-.9-.9-3.4M20.6 13.3l-3.4.9.9 3.4M5.9 17.6l.9-3.4-3.4-.9M18.1 6.4l-.9 3.4 3.4.9" />
    </Icon>
  )
}

export function SparklesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 3l1.8 4.7 4.7 1.8-4.7 1.8L11 16l-1.8-4.7-4.7-1.8 4.7-1.8z" />
      <path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </Icon>
  )
}

/* ---------- class themes ---------- */

export function OrbIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="13" r="7" />
      <path d="M13 8.5l-2.6 4.5h3.2l-2.6 4.5" />
      <path d="M18.5 2.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" />
    </Icon>
  )
}

export function AxeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v18" />
      <path d="M12 5.5C8.5 3.5 5 4.5 4 8.5c1 4 4.5 5 8 3" />
      <path d="M12 5.5c3.5-2 7-1 8 3-1 4-4.5 5-8 3" />
    </Icon>
  )
}

export function DaggerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.5l2 3.5v9h-4V6z" />
      <path d="M7 15h10M12 15v4.5" />
      <circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function ScalesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v15M8 20h8M5 7h14" />
      <circle cx="12" cy="4" r="1" fill="currentColor" stroke="none" />
      <path d="M5 7l-2.5 6h5zM19 7l-2.5 6h5z" />
    </Icon>
  )
}

export function EnsoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.5 9.5A8 8 0 1 0 17.6 17.8" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function StormLeafIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 19.5C4.5 10 10.5 4 20 4c0 9.5-6 15.5-15.5 15.5z" />
      <path d="M14.5 8l-3 4.5h3l-3.5 4.5" />
    </Icon>
  )
}

export function ShieldCrossIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z" />
      <path d="M12 7.5v9M8.5 11h7" />
    </Icon>
  )
}

export function BannerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3v18" />
      <path d="M6 4.5h12l-3 4 3 4H6" />
      <path d="M4 21h4" />
    </Icon>
  )
}

export function BowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 3c8 3 8 15 0 18" />
      <path d="M7 3v18" strokeWidth="1" />
      <path d="M3 12h17M17 9.5l3.5 2.5-3.5 2.5M4.5 10.5L6 12l-1.5 1.5" />
    </Icon>
  )
}
