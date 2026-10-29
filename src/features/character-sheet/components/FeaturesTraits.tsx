import { Card } from '../../../components/Card'
import { KiIcon } from '../../../components/KiIcon'
import { useT } from '../../../i18n/useI18n'
import { renderObsidianLine } from '../../../components/obsidian/renderObsidian'
import { useCanEdit } from '../../../store/canEdit'
import { useVaultStore } from '../../../store/vaultStore'
import type { CharacterFeature, CharacterFrontmatter, FeatureUsage } from '../../../vault/types'
import { isEndeavour } from '../../../rules/ruleset'
import { withResource } from '../rest'

const USAGES: FeatureUsage[] = ['action', 'reaction', 'passive']

/**
 * What a feature costs: action points as a plain chip, a class resource (Ki) as a button that pays it
 * from the pool — red when the pool can't, display only without edit permission.
 */
function FeatureCostChips({ feature, character, characterPath }: { feature: CharacterFeature; character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const canEdit = useCanEdit()
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const cost = feature.cost
  if (!cost) return null

  const spend = cost.resource
  const pool = spend ? character.class_resources?.find((r) => r.key === spend.key) : undefined
  const target = spend && canEdit ? character._write?.class_resources?.[spend.key] : undefined
  const affordable = !pool || !spend || pool.current >= spend.amount
  const chip = 'inline-flex items-center gap-1 rounded bg-black/20 px-1.5 py-0.5 font-num text-[0.7rem] leading-none'

  return (
    <span className="flex shrink-0 items-center gap-1">
      {cost.ap !== undefined && <span className={`${chip} text-fg-muted`}>{t('features.apCost', { count: cost.ap })}</span>}
      {spend &&
        (pool && target ? (
          <button
            type="button"
            className={`${chip} cursor-pointer transition hover:bg-black/35 disabled:cursor-not-allowed ${affordable ? 'ki-caption' : 'text-danger'}`}
            disabled={!affordable}
            title={affordable ? t('features.spendHint', { cost: spend.amount, name: spend.name, current: pool.current }) : t('features.cannotSpend', { name: spend.name })}
            onClick={() => {
              const next = pool.current - spend.amount
              void updateCharacterField(characterPath, target, next, (c) => withResource(c, spend.key, next))
            }}
          >
            <KiIcon />
            {spend.amount}
          </button>
        ) : (
          <span className={`${chip} ki-caption`} title={`${spend.amount} ${spend.name}`}>
            <KiIcon />
            {spend.amount}
          </span>
        ))}
    </span>
  )
}

function FeatureList({ features, character, characterPath }: { features: CharacterFeature[]; character: CharacterFrontmatter; characterPath: string }) {
  return (
    // In a wide card (the sheet on a very wide screen gives it its own `@container`) the list runs in two columns
    <ul className="space-y-3 @3xl:columns-2 @3xl:gap-x-6">
      {features.map((f) => (
        <li key={f.name} className="break-inside-avoid border-l-2 border-trim/40 pl-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-sm font-bold tracking-wide text-fg">{f.name}</span>
            <span className="flex items-center gap-2">
              {f.source && <span className="text-xs text-fg-muted">{f.source}</span>}
              <FeatureCostChips feature={f} character={character} characterPath={characterPath} />
            </span>
          </div>
          {f.description && <p className="mt-0.5 text-sm text-fg-muted">{renderObsidianLine(f.description, f.name)}</p>}
        </li>
      ))}
    </ul>
  )
}

/**
 * The character's features. Endeavour characters get them split by when they're used — actions,
 * reactions, passive (the DM's call in #9, matching the vault sheet's `Merkmale` embeds) — each
 * group only when it has any; D&D characters keep one plain list.
 */
export function FeaturesTraits({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const features = character.features ?? []
  if (features.length === 0) return null

  if (!isEndeavour(character)) {
    return (
      <Card title={t('cards.featuresTraits')}>
        <FeatureList features={features} character={character} characterPath={characterPath} />
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
            <FeatureList features={features} character={character} characterPath={characterPath} />
          </section>
        ))}
      </div>
    </Card>
  )
}
