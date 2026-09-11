import { Card } from '../../../components/Card'
import { renderObsidianLine } from '../../../vault/components/WikiLink'
import type { CharacterFrontmatter } from '../../../vault/types'

export function Conditions({ character }: { character: CharacterFrontmatter }) {
  const conditions = character.conditions
  if (!conditions) return null

  const { luck_points: luck, exhaustion, exhaustion_max = 9, notes } = conditions

  return (
    <Card title="Conditions">
      <div className="space-y-3">
        {luck && (
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-fg-muted">Luck Points</span>
              <span className="font-semibold text-fg">
                {luck.current}/{luck.max}
              </span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: luck.max }, (_, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rounded-full ${i < luck.current ? 'bg-accent' : 'border border-border bg-transparent'}`}
                />
              ))}
            </div>
          </div>
        )}
        {exhaustion !== undefined && (
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-fg-muted">Exhaustion</span>
              <span className={`font-semibold ${exhaustion >= 6 ? 'text-danger' : 'text-fg'}`}>
                {exhaustion}/{exhaustion_max}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: exhaustion_max }, (_, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rounded-sm ${i < exhaustion ? 'bg-danger' : 'border border-border bg-transparent'}`}
                />
              ))}
            </div>
          </div>
        )}
        {notes && <p className="text-sm text-fg-muted">{renderObsidianLine(notes, 'cond-notes')}</p>}
      </div>
    </Card>
  )
}
