import { useState } from 'react'
import { EditableNumber } from '../../../components/EditableNumber'
import { DamageRollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'
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
  tempPct,
  hitKey,
  onCommit,
  ariaLabel,
}: {
  current: number
  max: number
  tempPct: number
  hitKey: number
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
      <HpBarTrack pct={pct} tempPct={tempPct} hitKey={hitKey} />
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

/**
 * The bevelled bar itself: dark inset groove, gradient fill, and tick marks every 10 %. Temporary HP
 * sit on top as a shimmering arcane ward right after the health fill. When current + temp would
 * run past max, the ward slides back over the end of the health fill instead, the way many games
 * draw absorb shields. `hitKey` replays a short flash each time the ward absorbs damage.
 */
function HpBarTrack({ pct, tempPct, hitKey }: { pct: number; tempPct: number; hitKey: number }) {
  const wardStart = Math.min(pct, 100 - tempPct)
  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-full border bg-black/35 shadow-[inset_0_2px_6px_rgb(0_0_0/0.55)] transition-[border-color,box-shadow] duration-500 ${
        tempPct > 0 ? 'hp-warded border-accent/70' : 'border-trim/60'
      }`}
    >
      <div className={`h-full rounded-full bg-linear-to-r transition-[width] ${hpFillClass(pct)}`} style={{ width: `${pct}%` }} />
      {tempPct > 0 && (
        <div
          className="hp-ward absolute inset-y-0 transition-[left,width] duration-500"
          style={{ left: `${wardStart}%`, width: `${tempPct}%` }}
        />
      )}
      {hitKey > 0 && <span key={hitKey} className="hp-ward-hit absolute inset-0" />}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_calc(10%-1px),rgb(0_0_0/0.3)_calc(10%-1px),rgb(0_0_0/0.3)_10%)]" />
    </div>
  )
}

/** Heater shield with a four-point rune, the emblem of the temp-HP ward. */
function WardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="hp-ward-icon size-5 shrink-0" aria-hidden>
      <path
        d="M12 2.5 20 5.5V11c0 5-3.4 8.9-8 10.5C7.4 19.9 4 16 4 11V5.5Z"
        fill="color-mix(in srgb, currentColor 18%, transparent)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 7.5 13.2 11 16.5 12 13.2 13 12 16.5 10.8 13 7.5 12 10.8 11Z" fill="currentColor" />
    </svg>
  )
}

export function HitPoints({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const { current, max, temp = 0 } = character.hp
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const tempPct = max > 0 ? Math.max(0, Math.min(100, (temp / max) * 100)) : 0
  const hitDiceTotal = character.hit_dice.total
  const hitDiceRemaining = hitDiceTotal - (character.hit_dice.used ?? 0)
  const conMod = abilityModifier(character.abilities.con)

  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted'
  const writeTargets = character._write

  // Previous-value pattern: bump `wardHitKey` whenever temp HP go *down* (the ward took a hit), to
  // replay the flash on the bar. A different character doesn't count as a hit.
  const [prevTemp, setPrevTemp] = useState({ temp, characterPath })
  const [wardHitKey, setWardHitKey] = useState(0)
  if (prevTemp.temp !== temp || prevTemp.characterPath !== characterPath) {
    setPrevTemp({ temp, characterPath })
    if (prevTemp.characterPath === characterPath && temp < prevTemp.temp) setWardHitKey((k) => k + 1)
  }

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

  const tempEditable = canEdit && writeTargets?.hp_temp
  const tempControl = (tempEditable || temp > 0) && (
    <span className={`hp-ward-chip flex items-center gap-1.5 rounded-lg py-1 pr-2.5 pl-1.5 text-accent ${temp > 0 ? 'is-active' : ''}`}>
      <WardIcon />
      {tempEditable ? (
        <EditableNumber
          key={temp}
          value={temp}
          onCommit={(next) =>
            void updateCharacterField(characterPath, writeTargets.hp_temp, next, (c) => ({ ...c, hp: { ...c.hp, temp: next } }))
          }
          className="w-10 rounded-md border border-accent/30 bg-black/30 px-1 text-center font-num text-lg leading-tight text-accent"
        />
      ) : (
        <span className="font-num text-lg leading-tight">{temp}</span>
      )}
      <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em]">{t('stats.temp')}</span>
    </span>
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
        {temp > 0 && <span className="hp-ward-total text-2xl text-accent">+{temp}</span>}
      </div>
      {canEdit && writeTargets?.hp_current ? (
        <HpBarSlider
          key={current}
          current={current}
          max={max}
          tempPct={tempPct}
          hitKey={wardHitKey}
          ariaLabel={t('a11y.currentHp')}
          onCommit={(next) =>
            void updateCharacterField(characterPath, writeTargets.hp_current, next, (c) => ({ ...c, hp: { ...c.hp, current: next } }))
          }
        />
      ) : (
        <div className="relative mt-3 h-5">
          <HpBarTrack pct={pct} tempPct={tempPct} hitKey={wardHitKey} />
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
