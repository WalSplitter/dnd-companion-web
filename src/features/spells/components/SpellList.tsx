import type { SpellFrontmatter, VaultFile } from '../../../vault/types'
import type { VaultIndex } from '../../../vault/wikilinks'
import { resolveSpellLink } from '../../../vault/wikilinks'

const LEVEL_LABEL: Record<number, string> = { 0: 'Cantrips' }

export function SpellList({ links, index }: { links: string[]; index: VaultIndex }) {
  const resolved = links
    .map((link) => resolveSpellLink(index, link))
    .filter((s): s is VaultFile<SpellFrontmatter> => Boolean(s))

  const byLevel = new Map<number, VaultFile<SpellFrontmatter>[]>()
  for (const spell of resolved) {
    const level = spell.frontmatter.level
    if (!byLevel.has(level)) byLevel.set(level, [])
    byLevel.get(level)!.push(spell)
  }

  const levels = [...byLevel.keys()].sort((a, b) => a - b)

  if (levels.length === 0) {
    return <p className="text-sm text-fg-muted">No spells known.</p>
  }

  return (
    <div className="space-y-5">
      {levels.map((level) => (
        <div key={level}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-muted">
            {LEVEL_LABEL[level] ?? `Level ${level}`}
          </h3>
          <ul className="space-y-2">
            {byLevel
              .get(level)!
              .sort((a, b) => a.frontmatter.name.localeCompare(b.frontmatter.name))
              .map((spell) => (
                <SpellRow key={spell.path} spell={spell} />
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function SpellRow({ spell }: { spell: VaultFile<SpellFrontmatter> }) {
  const fm = spell.frontmatter
  return (
    <li className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-semibold text-fg">{fm.name}</span>
        <span className="text-xs italic text-fg-muted">{fm.school}</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-fg-muted sm:grid-cols-4">
        <div>
          <dt className="uppercase">Casting Time</dt>
          <dd className="text-fg">{fm.casting_time}</dd>
        </div>
        <div>
          <dt className="uppercase">Range</dt>
          <dd className="text-fg">{fm.range}</dd>
        </div>
        <div>
          <dt className="uppercase">Components</dt>
          <dd className="text-fg">{fm.components.join(', ')}</dd>
        </div>
        <div>
          <dt className="uppercase">Duration</dt>
          <dd className="text-fg">{fm.duration}</dd>
        </div>
      </dl>
      {spell.body && <p className="mt-2 text-sm text-fg">{spell.body}</p>}
    </li>
  )
}
