import { useState } from 'react'
import { Card } from '../../../components/Card'
import { useVaultStore } from '../../../store/vaultStore'
import type { CharacterFrontmatter } from '../../../vault/types'

/** Re-mounted with `key={value}` by the caller whenever `value` changes from outside (a committed
 * edit, or a rollback after a failed write) — simpler and effect-free vs. syncing local text state
 * to an external prop change. */
function EditableNumber({
  value,
  onCommit,
  className,
}: {
  value: number
  onCommit: (next: number) => void
  className: string
}) {
  const [text, setText] = useState(String(value))

  function commit() {
    const parsed = Math.max(0, Math.round(Number(text)))
    if (Number.isFinite(parsed) && parsed !== value) onCommit(parsed)
    else setText(String(value))
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setText(String(value))
      }}
      className={className}
    />
  )
}

export function HitPoints({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const { current, max, temp = 0 } = character.hp
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const hitDiceRemaining = character.hit_dice.total - (character.hit_dice.used ?? 0)

  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted'
  const writeTargets = character._write

  return (
    <Card title="Hit Points">
      <div className="flex items-end justify-between">
        <span className="flex items-baseline gap-1 text-2xl font-bold text-fg">
          {canEdit && writeTargets?.hp_current ? (
            <EditableNumber
              key={current}
              value={current}
              onCommit={(next) =>
                void updateCharacterField(characterPath, writeTargets.hp_current, next, (c) => ({ ...c, hp: { ...c.hp, current: next } }))
              }
              className="w-14 rounded-md border border-border bg-surface-2 px-1 text-center text-2xl font-bold text-fg"
            />
          ) : (
            current
          )}
          <span className="text-base font-normal text-fg-muted">/ {max}</span>
        </span>
        {canEdit && writeTargets?.hp_temp ? (
          <span className="flex items-center gap-1 text-sm font-medium text-accent">
            +
            <EditableNumber
              key={temp}
              value={temp}
              onCommit={(next) =>
                void updateCharacterField(characterPath, writeTargets.hp_temp, next, (c) => ({ ...c, hp: { ...c.hp, temp: next } }))
              }
              className="w-10 rounded-md border border-border bg-surface-2 px-1 text-center text-sm font-medium text-accent"
            />
            temp
          </span>
        ) : (
          temp > 0 && <span className="text-sm font-medium text-accent">+{temp} temp</span>
        )}
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
