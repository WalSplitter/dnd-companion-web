import type { ReactNode } from 'react'
import { Icon, type IconProps } from '../../theme/topicIcons'
import type { JournalKind } from '../../vault/types'

const KIND_ICON_PATHS: Record<JournalKind, ReactNode> = {
  // Quill
  note: (
    <>
      <path d="M20 4c-7 0-12 5-13 12l-2 4 4-2c7-1 11-7 11-14z" />
      <path d="M8 16l6-6" />
    </>
  ),
  // Exclamation in a diamond, the classic "quest giver" mark
  quest: (
    <>
      <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" />
      <path d="M12 7.5v5.5" />
      <circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  npc: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6" />
    </>
  ),
  place: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </>
  ),
  // Treasure chest
  loot: (
    <>
      <path d="M4 11h16v8H4z" />
      <path d="M4 11V9a4 3 0 0 1 4-3h8a4 3 0 0 1 4 3v2" />
      <path d="M11 13h2v2.5h-2z" />
    </>
  ),
  // Open book
  lore: (
    <>
      <path d="M3 5.5c3-1 6-.8 9 1.2 3-2 6-2.2 9-1.2V19c-3-1-6-.8-9 1.2-3-2-6-2.2-9-1.2z" />
      <path d="M12 6.7v13.5" />
    </>
  ),
}

export function JournalKindIcon({ kind, className }: IconProps & { kind: JournalKind }) {
  return <Icon className={className}>{KIND_ICON_PATHS[kind]}</Icon>
}

/** A wax seal with the DM's hooded eye: written by the DM, in the campaign journal. */
export function DmSealIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.4l2.2 1.5 2.6-.2 1.1 2.4 2.4 1.1-.2 2.6 1.5 2.2-1.5 2.2.2 2.6-2.4 1.1-1.1 2.4-2.6-.2L12 21.6l-2.2-1.5-2.6.2-1.1-2.4-2.4-1.1.2-2.6L2.4 12l1.5-2.2-.2-2.6 2.4-1.1 1.1-2.4 2.6.2z" />
      <path d="M7.6 13c1.2-1.9 2.7-2.9 4.4-2.9s3.2 1 4.4 2.9c-1.2 1.9-2.7 2.9-4.4 2.9S8.8 14.9 7.6 13z" />
      <circle cx="12" cy="13" r="1.1" fill="currentColor" stroke="none" />
      <path d="M8.6 8.9 12 7.4l3.4 1.5" />
    </Icon>
  )
}

/** Two arrows chasing each other: look for what changed. */
export function RefreshIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.5 9A8 8 0 0 0 5 7.5M4.5 15A8 8 0 0 0 19 16.5" />
      <path d="M5 3.5v4h4M19 20.5v-4h-4" />
    </Icon>
  )
}

export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 3.5h6l-1 5.5 3 3H7l3-3z" />
      <path d="M12 12v8.5" />
    </Icon>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20l4.5-1L19.5 8 16 4.5 5 15.5z" />
      <path d="M14 6.5l3.5 3.5" />
    </Icon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l1 13h9l1-13" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Icon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </Icon>
  )
}
