import type { CharacterFrontmatter } from '../../../vault/types'
import { classSummary } from '../../../vault/deriveStats'

export function Header({ character }: { character: CharacterFrontmatter }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="text-3xl font-bold text-fg">{character.name}</h1>
        <span className="text-sm text-fg-muted">{character.experience.toLocaleString()} XP</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg-muted">
        <span>{classSummary(character)}</span>
        <span>{character.species}</span>
        <span>{character.background}</span>
        <span>{character.alignment}</span>
      </div>
    </div>
  )
}
