import { Card } from '../../../components/Card'
import { passivePerception } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'

export function SensesLanguages({ character }: { character: CharacterFrontmatter }) {
  const senses = character.senses ?? {}
  const senseEntries = Object.entries(senses).filter(([, v]) => v)

  return (
    <Card title="Senses &amp; Languages">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-fg-muted">Passive Perception</dt>
          <dd className="font-semibold text-fg">{passivePerception(character)}</dd>
        </div>
        {senseEntries.map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <dt className="capitalize text-fg-muted">{key}</dt>
            <dd className="font-semibold text-fg">{value}</dd>
          </div>
        ))}
        {character.languages && character.languages.length > 0 && (
          <div>
            <dt className="text-fg-muted">Languages</dt>
            <dd className="mt-1 text-fg">{character.languages.join(', ')}</dd>
          </div>
        )}
        {character.tool_proficiencies && character.tool_proficiencies.length > 0 && (
          <div>
            <dt className="text-fg-muted">Tools</dt>
            <dd className="mt-1 text-fg">{character.tool_proficiencies.join(', ')}</dd>
          </div>
        )}
      </dl>
    </Card>
  )
}
