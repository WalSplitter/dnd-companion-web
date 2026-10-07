import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useT } from '../i18n/useI18n'
import { useOwlbearStore } from './owlbearStore'
import { savePanelPrefs } from './panel'

/**
 * Shows in the header while the app runs inside Owlbear Rodeo: connected, and in which role.
 */
export function OwlbearBadge() {
  const t = useT()
  const ready = useOwlbearStore((s) => s.ready)
  const role = useOwlbearStore((s) => s.role)
  const playerName = useOwlbearStore((s) => s.playerName)
  const { pathname } = useLocation()

  // Docking the panel elsewhere reloads it; this brings it back to the same page.
  useEffect(() => {
    savePanelPrefs({ path: pathname })
  }, [pathname])

  if (!ready || !role) return null
  const label = t(role === 'GM' ? 'owlbear.roleGM' : 'owlbear.rolePlayer')
  return (
    <span
      title={`${label} — ${t('owlbear.badgeTooltip', { name: playerName ?? '' })}`}
      className="inline-flex shrink-0 cursor-help items-center gap-1.5 rounded-full border border-trim/30 bg-trim/5 px-2 py-1 text-xs font-semibold whitespace-nowrap text-trim @min-[32rem]:px-2.5"
    >
      <span className="size-1.5 rounded-full bg-success" aria-hidden />
      <RoleIcon gm={role === 'GM'} />
      {/* The role in words where the header has room; the icon and tooltip tell it otherwise. */}
      <span className="sr-only @min-[32rem]:not-sr-only">{label}</span>
    </span>
  )
}

/** A crown for the GM, a figure for a player — the role at a glance where its name doesn't fit. */
function RoleIcon({ gm }: { gm: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 @min-[32rem]:hidden" aria-hidden>
      {gm ? (
        <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5Z" />
      ) : (
        <>
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}
    </svg>
  )
}
