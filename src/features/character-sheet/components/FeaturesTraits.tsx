import { Card } from '../../../components/Card'
import { useT } from '../../../i18n/I18nContext'
import { renderObsidianLine } from '../../../vault/components/WikiLink'
import type { CharacterFrontmatter } from '../../../vault/types'

export function FeaturesTraits({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const features = character.features ?? []
  if (features.length === 0) return null

  return (
    <Card title={t('cards.featuresTraits')}>
      <ul className="space-y-3">
        {features.map((f) => (
          <li key={f.name} className="border-l-2 border-trim/40 pl-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-sm font-bold tracking-wide text-fg">{f.name}</span>
              {f.source && <span className="text-xs text-fg-muted">{f.source}</span>}
            </div>
            {f.description && <p className="mt-0.5 text-sm text-fg-muted">{renderObsidianLine(f.description, f.name)}</p>}
          </li>
        ))}
      </ul>
    </Card>
  )
}
