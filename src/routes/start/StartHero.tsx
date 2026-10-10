import type { CSSProperties } from 'react'
import { ArcaneSigil } from '../../components/ArcaneSigil'
import { useT } from '../../i18n/useI18n'

/**
 * The start page's title block: stacked on narrow screens; on wide ones the sigil stands beside the
 * title, so the portals and the footer fit without scrolling. Laptop-height windows (`short`/`tight`)
 * shrink it further and drop the eyebrow and tagline; with a vault open a `tight` window drops the
 * hero altogether — the header already carries the name.
 */
export function StartHero({ vaultOpen }: { vaultOpen: boolean }) {
  const t = useT()
  return (
    <section
      className={`flex flex-col items-center text-center lg:flex-row lg:justify-center lg:gap-7 lg:text-left ${vaultOpen ? 'pb-4 pt-0 short:pb-3 tight:hidden tall:pb-7' : 'pb-6 pt-2 sm:pt-4 lg:pt-2 short:pb-4 tight:pb-2 tight:pt-0 tall:pb-9'}`}
    >
      <div className="rise-in relative shrink-0" style={{ '--i': 0 } as CSSProperties}>
        <div aria-hidden className="start-aura absolute inset-0 -z-10 rounded-full" />
        <ArcaneSigil className={vaultOpen ? 'size-16 sm:size-20 short:size-14 sm:short:size-16 tall:size-24 sm:tall:size-28' : 'size-24 sm:size-32 lg:size-28 short:size-20 sm:short:size-24 tight:size-16 sm:tight:size-16 lg:tall:size-36'} />
      </div>
      <div className="flex flex-col items-center lg:items-start">
        <p className={`rise-in text-[0.7rem] font-bold uppercase tracking-[0.35em] text-trim tight:hidden ${vaultOpen ? 'mt-2' : 'mt-4'} lg:mt-0`} style={{ '--i': 1 } as CSSProperties}>
          {t('start.eyebrow')}
        </p>
        <h1
          className={`rise-in start-title mt-2 font-display font-bold tracking-wide ${vaultOpen ? 'text-3xl sm:text-5xl sm:short:text-4xl sm:tall:text-6xl' : 'text-4xl sm:text-6xl sm:short:text-5xl sm:tight:text-4xl sm:tall:text-7xl'}`}
          style={{ '--i': 2 } as CSSProperties}
        >
          {t('app.brand')}
        </h1>
        <p className={`rise-in max-w-xl text-balance text-fg-muted short:text-sm tight:hidden ${vaultOpen ? 'mt-2' : 'mt-3'} lg:mt-2`} style={{ '--i': 3 } as CSSProperties}>
          {t('start.tagline')}
        </p>
        {!vaultOpen && (
          <div className="rise-in mt-4 flex w-64 items-center gap-3 short:hidden lg:hidden" style={{ '--i': 3 } as CSSProperties} aria-hidden>
            <span className="h-px flex-1 bg-linear-to-r from-transparent to-trim/50" />
            <span className="start-gem size-2 rotate-45 border border-trim bg-trim/30" />
            <span className="h-px flex-1 bg-linear-to-l from-transparent to-trim/50" />
          </div>
        )}
      </div>
    </section>
  )
}
