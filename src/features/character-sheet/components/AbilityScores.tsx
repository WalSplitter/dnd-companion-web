import { Card } from '../../../components/Card'
import { abilityModifier, formatModifier } from '../../../vault/deriveStats'
import { ABILITIES, type CharacterFrontmatter } from '../../../vault/types'

export function AbilityScores({ character }: { character: CharacterFrontmatter }) {
  return (
    <Card title="Ability Scores">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ABILITIES.map(({ key, label }) => {
          const score = character.abilities[key]
          const mod = abilityModifier(score)
          return (
            <div
              key={key}
              className="flex flex-col items-center rounded-lg border border-border bg-surface-2 px-2 py-3 text-center"
            >
              <span className="text-xs font-medium uppercase text-fg-muted">{label.slice(0, 3)}</span>
              <span className="mt-1 text-xl font-bold text-fg">{formatModifier(mod)}</span>
              <span className="mt-0.5 text-xs text-fg-muted">{score}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
