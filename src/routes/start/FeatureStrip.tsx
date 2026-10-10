import type { CSSProperties, ReactNode } from 'react'
import { useT } from '../../i18n/useI18n'
import { LinkIcon, LockIcon, PaletteIcon, QuillIcon } from './portalIcons'

function Feature({ icon, title, body, index }: { icon: ReactNode; title: string; body: string; index: number }) {
  return (
    <div className="rise-in flex items-start gap-3" style={{ '--i': index + 6 } as CSSProperties}>
      <span className="feature-icon flex size-8 shrink-0 items-center justify-center rounded-lg border border-trim/30 bg-trim/5 text-trim">{icon}</span>
      <div>
        <p className="font-display text-sm font-bold tracking-wide text-fg">{title}</p>
        <p className="text-xs leading-relaxed text-fg-muted">{body}</p>
      </div>
    </div>
  )
}

/** What the app offers, in four lines. A nice-to-have: on wide but short screens it gives way so the
 * portals and the footer stay on one screen; where the page scrolls anyway (narrow screens) it stays. */
export function FeatureStrip() {
  const t = useT()
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-trim/15 pt-5 pb-1 sm:grid-cols-2 lg:grid-cols-4 lg:short:hidden tall:mt-10">
      <Feature index={0} title={t('start.featureLocalTitle')} body={t('start.featureLocalBody')} icon={<LockIcon />} />
      <Feature index={1} title={t('start.featureWriteTitle')} body={t('start.featureWriteBody')} icon={<QuillIcon />} />
      <Feature index={2} title={t('start.featureObsidianTitle')} body={t('start.featureObsidianBody')} icon={<LinkIcon />} />
      <Feature index={3} title={t('start.featureThemesTitle')} body={t('start.featureThemesBody')} icon={<PaletteIcon />} />
    </div>
  )
}
