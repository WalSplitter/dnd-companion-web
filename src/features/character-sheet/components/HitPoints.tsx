import { useState } from 'react'
import { EditableNumber } from '../../../components/EditableNumber'
import { DamageRollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/I18nContext'
import { useVaultStore } from '../../../store/vaultStore'
import { abilityModifier } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'

/** Bar colour follows how hurt the character is, like a game HUD: healthy → bloodied → critical. */
function hpFillClass(pct: number): string {
  if (pct > 50) return 'from-success/60 to-success'
  if (pct > 25) return 'from-warning/60 to-warning'
  return 'from-danger/60 to-danger'
}

/**
 * The HP bar itself is the slider — not a separate control underneath it. A fully transparent
 * native `<input type="range">`, sized for a comfortable drag/touch target, sits on top of the
 * visual fill bar and drives it; while dragging (pointer or keyboard), a small tooltip tracks the
 * thumb showing the live value. Re-mounted with `key={current}` whenever the committed value
 * changes from outside, same reasoning as `EditableNumber`.
 */
function HpBarSlider({
  current,
  max,
  onCommit,
  ariaLabel,
}: {
  current: number
  max: number
  onCommit: (next: number) => void
  ariaLabel: string
}) {
  const [value, setValue] = useState(current)
  const [dragging, setDragging] = useState(false)
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0

  function endDrag() {
    setDragging(false)
    if (value !== current) onCommit(value)
  }

  return (
    <div className="relative mt-3 h-5">
      <HpBarTrack pct={pct} />
      {dragging && (
        <div
          className="pointer-events-none absolute -top-8 -translate-x-1/2 whitespace-nowrap rounded-md border border-trim/50 bg-surface px-1.5 py-0.5 text-xs font-semibold text-fg shadow-md"
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
        className="absolute inset-x-0 -top-1 h-7 w-full cursor-pointer opacity-0"
        aria-label={ariaLabel}
      />
    </div>
  )
}

/** The bevelled bar itself: dark inset groove, gradient fill, and tick marks every 10 %. */
function HpBarTrack({ pct }: { pct: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-full border border-trim/60 bg-black/35 shadow-[inset_0_2px_6px_rgb(0_0_0/0.55)]">
      <div className={`h-full rounded-full bg-linear-to-r transition-[width] ${hpFillClass(pct)}`} style={{ width: `${pct}%` }} />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_calc(10%-1px),rgb(0_0_0/0.3)_calc(10%-1px),rgb(0_0_0/0.3)_10%)]" />
    </div>
  )
}

export function HitPoints({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const { current, max, temp = 0 } = character.hp
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const hitDiceTotal = character.hit_dice.total
  const hitDiceRemaining = hitDiceTotal - (character.hit_dice.used ?? 0)
  const conMod = abilityModifier(character.abilities.con)

  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted'
  const writeTargets = character._write

  const currentControl =
    canEdit && writeTargets?.hp_current ? (
      <EditableNumber
        key={current}
        value={current}
        max={max}
        onCommit={(next) =>
          void updateCharacterField(characterPath, writeTargets.hp_current, next, (c) => ({ ...c, hp: { ...c.hp, current: next } }))
        }
        className="w-20 rounded-md border border-border bg-surface-2 px-1 text-center font-num text-4xl text-fg"
      />
    ) : (
      current
    )

  const tempControl =
    canEdit && writeTargets?.hp_temp ? (
      <span className="rpg-plate flex items-center gap-1 px-2 py-1 text-sm font-medium text-accent">
        +
        <EditableNumber
          key={temp}
          value={temp}
          onCommit={(next) =>
            void updateCharacterField(characterPath, writeTargets.hp_temp, next, (c) => ({ ...c, hp: { ...c.hp, temp: next } }))
          }
          className="w-10 rounded-md border border-border bg-surface-2 px-1 text-center text-sm font-medium text-accent"
        />
        {t('stats.temp')}
      </span>
    ) : (
      temp > 0 && (
        <span className="rpg-plate px-2 py-1 text-sm font-medium text-accent">
          +{temp} {t('stats.temp')}
        </span>
      )
    )

  return (
    <div className="min-w-0 flex-1 basis-64">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.16em] text-trim">
          <span aria-hidden className="size-1.5 rotate-45 bg-trim" />
          {t('cards.hitPoints')}
        </h2>
        {tempControl}
      </div>
      <div className="mt-1 flex items-baseline gap-2 font-num text-4xl leading-none text-fg">
        {currentControl}
        <span className="text-xl font-medium text-fg-muted">/ {max}</span>
      </div>
      {canEdit && writeTargets?.hp_current ? (
        <HpBarSlider
          key={current}
          current={current}
          max={max}
          ariaLabel={t('a11y.currentHp')}
          onCommit={(next) =>
            void updateCharacterField(characterPath, writeTargets.hp_current, next, (c) => ({ ...c, hp: { ...c.hp, current: next } }))
          }
        />
      ) : (
        <div className="relative mt-3 h-5">
          <HpBarTrack pct={pct} />
        </div>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-trim/20 pt-2 text-sm text-fg-muted">
        <span>{t('stats.hitDice')}</span>
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
          <DamageRollButton label={t('roll.hitDie')} dice={`1${character.hit_dice.die}`} bonus={conMod} />
        </span>
      </div>
    </div>
  )
}
