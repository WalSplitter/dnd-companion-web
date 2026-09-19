import { Card } from '../../../components/Card'
import { useT } from '../../../i18n/I18nContext'
import type { CharacterFrontmatter } from '../../../vault/types'

function Pips({ count, colorClass }: { count: number; colorClass: string }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 3 }, (_, i) => (
        <span
          key={i}
          className={`size-4 rounded-full border-2 border-trim/50 ${i < count ? colorClass : 'bg-transparent'}`}
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
      <div className="flex flex-wrap gap-x-10 gap-y-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted">{t('stats.successes')}</span>
          <Pips count={successes} colorClass="bg-success shadow-[0_0_8px_var(--color-success)]" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-fg-muted">{t('stats.failures')}</span>
          <Pips count={failures} colorClass="bg-danger shadow-[0_0_8px_var(--color-danger)]" />
        </div>
      </div>
    </Card>
  )
}
