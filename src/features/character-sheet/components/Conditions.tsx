import { Card } from '../../../components/Card'
import { useT } from '../../../i18n/useI18n'
import { useCanEdit, useVaultStore } from '../../../store/vaultStore'
import type { CharacterFrontmatter } from '../../../vault/types'

export function Conditions({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const conditions = character.conditions
  const canEdit = useCanEdit()
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  if (!conditions) return null

  // Exhaustion lives with the other vitals (HitPoints), not here. The free-text condition notes aren't
  // shown: they can't be edited from the sheet and only cost space.
  const luck = conditions.luck_points
  if (!luck) return null
  const writeTargets = character._write

  return (
    <Card title={t('cards.conditions')}>
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-fg-muted">{t('stats.luckPoints')}</span>
          <span className="font-semibold text-fg">
            {luck.current}/{luck.max}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: luck.max }, (_, i) => {
            const held = luck.held[i]
            const target = writeTargets?.luck_points?.[i]
            const pipClass = `size-3.5 rounded-full ${held ? 'bg-accent shadow-[0_0_8px_var(--color-accent)]' : 'border border-trim/40 bg-transparent'}`
            if (!canEdit || !target) return <span key={i} className={pipClass} />
            return (
              <button
                key={i}
                type="button"
                aria-label={t('a11y.luckPoint', { n: i + 1 })}
                onClick={() =>
                  void updateCharacterField(characterPath, target, !held, (c) => {
                    if (!c.conditions?.luck_points) return c
                    const nextHeld = c.conditions.luck_points.held.map((h, idx) => (idx === i ? !held : h))
                    return { ...c, conditions: { ...c.conditions, luck_points: { ...c.conditions.luck_points, held: nextHeld, current: nextHeld.filter(Boolean).length } } }
                  })
                }
                className={`${pipClass} cursor-pointer transition hover:opacity-70`}
              />
            )
          })}
        </div>
      </div>
    </Card>
  )
}
