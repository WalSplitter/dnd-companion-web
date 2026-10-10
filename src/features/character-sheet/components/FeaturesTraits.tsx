import { Card } from '../../../components/Card'
import { useT } from '../../../i18n/useI18n'
import { renderObsidianLine } from '../../../components/obsidian/renderObsidian'
import type { CharacterFeature, CharacterFrontmatter, FeatureUsage } from '../../../vault/types'

const USAGES: FeatureUsage[] = ['action', 'reaction', 'passive']

function FeatureList({ features }: { features: CharacterFeature[] }) {
  return (
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
  )
}

/**
 * The character's features. Nimble characters get them split by when they're used — actions,
 * reactions, passive (the DM's call in #9, matching the vault sheet's `Merkmale` embeds) — each
 * group only when it has any; D&D characters keep one plain list.
 */
export function FeaturesTraits({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const features = character.features ?? []
  if (features.length === 0) return null

  if (!character.nimble_attributes) {
    return (
      <Card title={t('cards.featuresTraits')}>
        <FeatureList features={features} />
      </Card>
    )
  }

  const groups = USAGES.map((usage) => ({ usage, features: features.filter((f) => (f.usage ?? 'passive') === usage) })).filter(
    (group) => group.features.length > 0,
  )

  return (
    <Card title={t('cards.featuresTraits')}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-x-6 gap-y-4">
        {groups.map(({ usage, features }) => (
          <section key={usage}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-muted">{t(`features.${usage}`)}</h3>
            <FeatureList features={features} />
          </section>
        ))}
      </div>
    </Card>
  )
}
