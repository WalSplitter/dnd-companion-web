import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useT } from '../i18n/useI18n'
import { getObr, useOwlbearStore } from './owlbearStore'
import { closePanel, savePanelPrefs } from './panel'

/**
 * Shows in the header while the app runs inside Owlbear Rodeo: connected, and in which role — plus
 * the panel's close button, as the panel ignores clicks elsewhere so it stays open beside the map.
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
  const obr = getObr()

  return (
    <>
      <span
        title={t('owlbear.badgeTooltip', { name: playerName ?? '' })}
        className="inline-flex shrink-0 cursor-help items-center gap-1.5 rounded-full border border-trim/30 bg-trim/5 px-2.5 py-1 text-xs font-semibold text-trim"
      >
        <span className="size-1.5 rounded-full bg-success" aria-hidden />
        {t(role === 'GM' ? 'owlbear.roleGM' : 'owlbear.rolePlayer')}
      </span>
      {obr && (
        <button
          type="button"
          onClick={() => void closePanel(obr)}
          title={t('owlbear.closePanel')}
          aria-label={t('owlbear.closePanel')}
          className="order-last shrink-0 rounded-md px-2 py-1 text-fg-muted transition hover:bg-surface-2 hover:text-fg"
        >
          ✕
        </button>
      )}
    </>
  )
}
