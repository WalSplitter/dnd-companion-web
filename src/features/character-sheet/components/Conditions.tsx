import { Card } from '../../../components/Card'
import { useT } from '../../../i18n/useI18n'
import { useCanEdit, useVaultStore } from '../../../store/vaultStore'
import { renderObsidianLine } from '../../../vault/components/renderObsidian'
import type { CharacterFrontmatter } from '../../../vault/types'

export function Conditions({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const conditions = character.conditions
  const canEdit = useCanEdit()
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  if (!conditions) return null

  // Exhaustion lives with the other vitals (HitPoints), not here.
  const { luck_points: luck, notes } = conditions
  if (!luck && !notes) return null
  const writeTargets = character._write

  return (
    <Card title={t('cards.conditions')}>
      <div className="space-y-3">
        {luck && (
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
        )}
        {notes && <p className="text-sm text-fg-muted">{renderObsidianLine(notes, 'cond-notes')}</p>}
      </div>
    </Card>
  )
}
