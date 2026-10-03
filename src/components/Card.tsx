import type { PropsWithChildren, ReactNode } from 'react'
import { SectionTitle } from './SectionTitle'

/** Framed sheet panel. The title sits on a gilded rule, like a section header on a game menu;
 * `aside` puts a few compact values at the rule's end (wrapping under the title on narrow screens). */
export function Card({ title, aside, children, className = '' }: PropsWithChildren<{ title?: ReactNode; aside?: ReactNode; className?: string }>) {
  return (
    <section className={`rpg-panel p-4 ${className}`}>
      {title && aside ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <SectionTitle className="min-w-40 flex-1">{title}</SectionTitle>
          {aside}
        </div>
      ) : (
        title && <SectionTitle className="mb-3">{title}</SectionTitle>
      )}
      {children}
    </section>
  )
}
