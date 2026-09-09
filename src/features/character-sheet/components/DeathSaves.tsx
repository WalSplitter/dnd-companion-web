import { Card } from '../../../components/Card'
import type { CharacterFrontmatter } from '../../../vault/types'

function Pips({ count, colorClass }: { count: number; colorClass: string }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 3 }, (_, i) => (
        <span
          key={i}
          className={`h-4 w-4 rounded-full border-2 border-border ${i < count ? colorClass : 'bg-transparent'}`}
        />
      ))}
    </div>
  )
}

export function DeathSaves({ character }: { character: CharacterFrontmatter }) {
  if (character.hp.current > 0) return null

  const successes = character.death_saves?.successes ?? 0
  const failures = character.death_saves?.failures ?? 0

  return (
    <Card title="Death Saves">
      <div className="flex items-center justify-between text-sm">
        <span className="text-fg-muted">Successes</span>
        <Pips count={successes} colorClass="bg-success" />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-fg-muted">Failures</span>
        <Pips count={failures} colorClass="bg-danger" />
      </div>
    </Card>
  )
}
