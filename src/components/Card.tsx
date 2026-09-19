import type { PropsWithChildren, ReactNode } from 'react'
import { SectionTitle } from './SectionTitle'

/** Framed sheet panel. The title sits on a gilded rule, like a section header on a game menu. */
export function Card({ title, children, className = '' }: PropsWithChildren<{ title?: ReactNode; className?: string }>) {
  return (
    <section className={`rpg-panel p-4 ${className}`}>
      {title && <SectionTitle className="mb-3">{title}</SectionTitle>}
      {children}
    </section>
  )
}
