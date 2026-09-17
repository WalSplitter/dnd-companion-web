import { Card } from '../../../components/Card'
import { useT } from '../../../i18n/I18nContext'
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
  const t = useT()
  if (character.hp.current > 0) return null

  const successes = character.death_saves?.successes ?? 0
  const failures = character.death_saves?.failures ?? 0

  return (
    <Card title={t('cards.deathSaves')}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-fg-muted">{t('stats.successes')}</span>
        <Pips count={successes} colorClass="bg-success" />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-fg-muted">{t('stats.failures')}</span>
        <Pips count={failures} colorClass="bg-danger" />
      </div>
    </Card>
  )
}
