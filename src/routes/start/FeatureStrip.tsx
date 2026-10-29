import type { CSSProperties, ReactNode } from 'react'
import { useT } from '../../i18n/useI18n'
import { LinkIcon, LockIcon, PaletteIcon, QuillIcon } from './portalIcons'

function Feature({ icon, title, body, index, stacked = false }: { icon: ReactNode; title: string; body: string; index: number; stacked?: boolean }) {
  return (
    <div className={`rise-in flex gap-3 ${stacked ? 'flex-col items-center' : 'items-start'}`} style={{ '--i': index + 6 } as CSSProperties}>
      <span className="feature-icon flex size-8 shrink-0 items-center justify-center rounded-lg border border-trim/30 bg-trim/5 text-trim">{icon}</span>
      <div>
        <p className="font-display text-sm font-bold tracking-wide text-fg">{title}</p>
        <p className="text-xs leading-relaxed text-fg-muted">{body}</p>
      </div>
    </div>
  )
}

function useFeatures() {
  const t = useT()
  return [
    { title: t('start.featureLocalTitle'), body: t('start.featureLocalBody'), icon: <LockIcon /> },
    { title: t('start.featureWriteTitle'), body: t('start.featureWriteBody'), icon: <QuillIcon /> },
    { title: t('start.featureObsidianTitle'), body: t('start.featureObsidianBody'), icon: <LinkIcon /> },
    { title: t('start.featureThemesTitle'), body: t('start.featureThemesBody'), icon: <PaletteIcon /> },
  ]
}

/** What the app offers, in four lines. A nice-to-have: on wide but short screens it gives way so the
 * portals and the footer stay on one screen; where the page scrolls anyway (narrow screens) it stays.
 * Very wide screens hang it beside the portals instead, as two `FeatureWing`s. */
export function FeatureStrip() {
  const features = useFeatures()
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-trim/15 pt-5 pb-1 sm:grid-cols-2 lg:grid-cols-4 lg:short:hidden tall:mt-10 wide:hidden">
      {features.map((feature, i) => (
        <Feature key={feature.title} index={i} {...feature} />
      ))}
    </div>
  )
}

/** Half of the features as a banner beside the portals — only on very wide screens, where the
 * room beside the page would otherwise stay empty (see `.feature-wing`). */
export function FeatureWing({ side }: { side: 'left' | 'right' }) {
  const features = useFeatures()
  const shown = side === 'left' ? features.slice(0, 2) : features.slice(2)
  return (
    <aside data-side={side} className="feature-wing hidden wide:flex">
      <span className="feature-wing-rod" aria-hidden />
      <div className="feature-wing-cloth">
        {shown.map((feature, i) => (
          <Feature key={feature.title} index={(side === 'left' ? 0 : 2) + i} stacked {...feature} />
        ))}
      </div>
    </aside>
  )
}
