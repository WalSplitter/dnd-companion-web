import type { CharacterFrontmatter } from '../../../vault/types'
import { classSummary } from '../../../vault/deriveStats'

export function Header({ character }: { character: CharacterFrontmatter }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {character.portrait_url && (
          <img
            src={character.portrait_url}
            alt={`${character.name} portrait`}
            className="h-20 w-20 shrink-0 rounded-lg border border-border object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
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
      </div>
    </div>
  )
}
