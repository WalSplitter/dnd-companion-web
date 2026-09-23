import { Card } from '../../../components/Card'
import { useT } from '../../../i18n/useI18n'
import { useVaultStore } from '../../../store/vaultStore'
import { renderObsidianLine } from '../../../vault/components/renderObsidian'
import type { CharacterFrontmatter } from '../../../vault/types'

export function Conditions({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const conditions = character.conditions
  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  if (!conditions) return null

  const { luck_points: luck, exhaustion, exhaustion_max = 9, notes } = conditions
  const canEdit = editPermission === 'granted'
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
        {exhaustion !== undefined && (
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-fg-muted">{t('stats.exhaustion')}</span>
              <span className={`font-semibold ${exhaustion >= 6 ? 'text-danger' : 'text-fg'}`}>
                {exhaustion}/{exhaustion_max}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: exhaustion_max }, (_, i) => {
                const filled = i < exhaustion
                const pipClass = `size-3.5 rounded-sm ${filled ? 'bg-danger shadow-[0_0_8px_var(--color-danger)]' : 'border border-trim/40 bg-transparent'}`
                const target = writeTargets?.exhaustion
                if (!canEdit || !target) return <span key={i} className={pipClass} />
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={t('a11y.exhaustionLevel', { n: i + 1 })}
                    onClick={() => {
                      const next = exhaustion === i + 1 ? i : i + 1
                      void updateCharacterField(characterPath, target, next, (c) =>
                        c.conditions ? { ...c, conditions: { ...c.conditions, exhaustion: next } } : c,
                      )
                    }}
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
