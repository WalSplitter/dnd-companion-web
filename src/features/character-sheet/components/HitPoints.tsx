import { useState } from 'react'
import { Card } from '../../../components/Card'
import { EditableNumber } from '../../../components/EditableNumber'
import { DamageRollButton } from '../../../dice/RollButton'
import { useVaultStore } from '../../../store/vaultStore'
import { abilityModifier } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'

/**
 * The HP bar itself is the slider — not a separate control underneath it. A fully transparent
 * native `<input type="range">`, sized for a comfortable drag/touch target, sits on top of the
 * visual fill bar and drives it; while dragging (pointer or keyboard), a small tooltip tracks the
 * thumb showing the live value. Re-mounted with `key={current}` whenever the committed value
 * changes from outside, same reasoning as `EditableNumber`.
 */
function HpBarSlider({ current, max, onCommit }: { current: number; max: number; onCommit: (next: number) => void }) {
  const [value, setValue] = useState(current)
  const [dragging, setDragging] = useState(false)
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0

  function endDrag() {
    setDragging(false)
    if (value !== current) onCommit(value)
  }

  return (
    <div className="relative mt-2 h-2">
      <div className="absolute inset-0 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      {dragging && (
        <div
          className="pointer-events-none absolute -top-7 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs font-semibold text-fg shadow-md"
          style={{ left: `${pct}%` }}
        >
          {value}
        </div>
      )}
      <input
        type="range"
        min={0}
        max={max}
        value={Math.min(value, max)}
        onChange={(e) => setValue(Number(e.target.value))}
        onPointerDown={() => setDragging(true)}
        onPointerUp={endDrag}
        onKeyDown={() => setDragging(true)}
        onKeyUp={endDrag}
        onBlur={() => setDragging(false)}
        className="absolute inset-x-0 -top-2 h-6 w-full cursor-pointer opacity-0"
        aria-label="Current hit points"
      />
    </div>
  )
}

export function HitPoints({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const { current, max, temp = 0 } = character.hp
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const hitDiceTotal = character.hit_dice.total
  const hitDiceRemaining = hitDiceTotal - (character.hit_dice.used ?? 0)
  const conMod = abilityModifier(character.abilities.con)

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
              max={max}
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
      {canEdit && writeTargets?.hp_current ? (
        <HpBarSlider
          key={current}
          current={current}
          max={max}
          onCommit={(next) =>
            void updateCharacterField(characterPath, writeTargets.hp_current, next, (c) => ({ ...c, hp: { ...c.hp, current: next } }))
          }
        />
      ) : (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-sm text-fg-muted">
        <span>Hit Dice</span>
        <span className="flex items-center gap-1.5 font-semibold text-fg">
          {canEdit && writeTargets?.hit_dice_remaining ? (
            <EditableNumber
              key={hitDiceRemaining}
              value={hitDiceRemaining}
              max={hitDiceTotal}
              onCommit={(next) =>
                void updateCharacterField(characterPath, writeTargets.hit_dice_remaining, next, (c) => ({
                  ...c,
                  hit_dice: { ...c.hit_dice, used: c.hit_dice.total - next },
                }))
              }
              className="w-10 rounded-md border border-border bg-surface-2 px-1 text-center text-sm font-semibold text-fg"
            />
          ) : (
            hitDiceRemaining
          )}
          /{hitDiceTotal} {character.hit_dice.die}
          <DamageRollButton label="Hit Die" dice={`1${character.hit_dice.die}`} bonus={conMod} />
        </span>
      </div>
    </Card>
  )
}
