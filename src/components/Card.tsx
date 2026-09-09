import type { PropsWithChildren, ReactNode } from 'react'

export function Card({ title, children }: PropsWithChildren<{ title?: ReactNode }>) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      {title && <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">{title}</h2>}
      {children}
    </section>
  )
}
