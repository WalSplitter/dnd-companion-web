import { Card } from '../../../components/Card'
import type { CharacterFrontmatter } from '../../../vault/types'

export function HitPoints({ character }: { character: CharacterFrontmatter }) {
  const { current, max, temp = 0 } = character.hp
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const hitDiceRemaining = character.hit_dice.total - (character.hit_dice.used ?? 0)

  return (
    <Card title="Hit Points">
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-fg">
          {current} <span className="text-base font-normal text-fg-muted">/ {max}</span>
        </span>
        {temp > 0 && <span className="text-sm font-medium text-accent">+{temp} temp</span>}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-fg-muted">
        <span>Hit Dice</span>
        <span className="font-semibold text-fg">
          {hitDiceRemaining}/{character.hit_dice.total} {character.hit_dice.die}
        </span>
      </div>
    </Card>
  )
}
