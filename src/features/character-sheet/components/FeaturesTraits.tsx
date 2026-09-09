import { Card } from '../../../components/Card'
import type { CharacterFrontmatter } from '../../../vault/types'

export function FeaturesTraits({ character }: { character: CharacterFrontmatter }) {
  const features = character.features ?? []
  if (features.length === 0) return null

  return (
    <Card title="Features &amp; Traits">
      <ul className="space-y-3">
        {features.map((f) => (
          <li key={f.name}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-fg">{f.name}</span>
              {f.source && <span className="text-xs text-fg-muted">{f.source}</span>}
            </div>
            {f.description && <p className="mt-0.5 text-sm text-fg-muted">{f.description}</p>}
          </li>
        ))}
      </ul>
    </Card>
  )
}
