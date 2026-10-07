import { useT } from '../i18n/useI18n'
import { OwlbearResizeGrips } from './OwlbearResizeGrips'
import { getObr, useOwlbearStore } from './owlbearStore'
import { closePanel, minimizePanel } from './panel'

const BUTTON = 'shrink-0 rounded-md px-2 py-1 text-fg-muted transition hover:bg-surface-2 hover:text-fg'

/**
 * Minimize and close for the panel in Owlbear Rodeo, at the header's right end — the panel ignores
 * clicks elsewhere so it stays open beside the map. Minimized, a round button beside Owlbear's tools
 * stands in for it (`owlbear-mini.html`); the page stays loaded and comes back as it was. Also the
 * grips to size the panel by hand.
 */
export function OwlbearWindowControls() {
  const t = useT()
  const ready = useOwlbearStore((s) => s.ready)
  const obr = getObr()
  if (!ready || !obr) return null

  return (
    <div className="flex shrink-0 items-center">
      <OwlbearResizeGrips obr={obr} />
      <button type="button" onClick={() => void minimizePanel(obr)} title={t('owlbear.minimizePanel')} aria-label={t('owlbear.minimizePanel')} className={BUTTON}>
        –
      </button>
      <button type="button" onClick={() => void closePanel(obr)} title={t('owlbear.closePanel')} aria-label={t('owlbear.closePanel')} className={BUTTON}>
        ✕
      </button>
    </div>
  )
}
