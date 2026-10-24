import type { PropsWithChildren, ReactNode } from 'react'
import { SectionTitle } from './SectionTitle'

/** Framed sheet panel. The title sits on a gilded rule, like a section header on a game menu;
 * `aside` puts a few compact values at the rule's end (wrapping under the title on narrow screens),
 * `titleExtra` small marks right after the title (learn-mode runes) that its truncation never hides. */
export function Card({
  title,
  titleExtra,
  aside,
  children,
  className = '',
}: PropsWithChildren<{ title?: ReactNode; titleExtra?: ReactNode; aside?: ReactNode; className?: string }>) {
  return (
    <section className={`rpg-panel p-4 ${className}`}>
      {title && aside ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <SectionTitle className="min-w-40 flex-1" extra={titleExtra}>
            {title}
          </SectionTitle>
          {aside}
        </div>
      ) : (
        title && (
          <SectionTitle className="mb-3" extra={titleExtra}>
            {title}
          </SectionTitle>
        )
      )}
      {children}
    </section>
  )
}
