import { useState, type ReactNode } from 'react'
import { EditableNumber } from '../../../components/EditableNumber'
import { DamageRollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'
import { useVaultStore } from '../../../store/vaultStore'
import { abilityModifier } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'
import { DEFAULT_EXHAUSTION_MAX, stepWithin } from '../vitals'
import { ExhaustionTrack, StepButton } from './VitalPools'

/** Bar colour follows how hurt the character is, like a game HUD: healthy → bloodied → critical. */
function hpFillClass(pct: number): string {
  if (pct > 50) return 'from-success/60 to-success'
  if (pct > 25) return 'from-warning/60 to-warning'
  return 'from-danger/60 to-danger'
}

/** Divider lines every `100 / count` %: one per point for small pools, every 10 % otherwise. */
function tickBackground(count: number): string {
  const step = `calc(100% / ${count})`
  return `repeating-linear-gradient(90deg, transparent 0, transparent calc(${step} - 1px), rgb(0 0 0 / 0.32) calc(${step} - 1px), rgb(0 0 0 / 0.32) ${step})`
}

/**
 * The bar itself is the slider, not a separate control underneath it. A fully transparent native
 * `<input type="range">`, sized for a comfortable drag/touch target, sits on top of the visual bar
 * and drives it; while dragging (pointer or keyboard), a small tooltip tracks the thumb showing the
 * live value. Re-mounted with `key={current}` whenever the committed value changes from outside,
 * same reasoning as `EditableNumber`.
 */
function BarSlider({
  current,
  max,
  onCommit,
  ariaLabel,
  heightClass,
  children,
}: {
  current: number
  max: number
  onCommit: (next: number) => void
  ariaLabel: string
  heightClass: string
  children: (pct: number) => ReactNode
}) {
  const [value, setValue] = useState(current)
  const [dragging, setDragging] = useState(false)
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0

  function endDrag() {
    setDragging(false)
    if (value !== current) onCommit(value)
  }

  return (
    <div className={`relative ${heightClass}`}>
      {children(pct)}
      {dragging && (
        <div
          className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-trim/50 bg-surface px-1.5 py-0.5 text-xs font-semibold text-fg shadow-md"
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
        className="absolute inset-x-0 -top-1 h-[calc(100%+0.5rem)] w-full cursor-pointer opacity-0"
        aria-label={ariaLabel}
      />
    </div>
  )
}

/**
 * A bevelled bar: dark inset groove, gradient fill, and tick marks. While temp HP are up, the
 * *first* bar in the damage order (resilience, or HP when there is none) sits inside a shimmering
 * arcane ward: a glowing frame with faint drifting runes over the whole bar, which leaves the fill
 * readable at any temp value. `hitKey` replays a short flash each time the ward absorbs damage.
 */
function BarTrack({
  pct,
  fillClass,
  ticks,
  warded = false,
  hitKey = 0,
}: {
  pct: number
  fillClass: string
  ticks: number
  warded?: boolean
  hitKey?: number
}) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-full border bg-black/35 shadow-[inset_0_1px_4px_rgb(0_0_0/0.55)] transition-[border-color,box-shadow] duration-500 ${
        warded ? 'hp-warded border-accent/70' : 'border-trim/45'
      }`}
    >
      <div className={`h-full rounded-full transition-[width] ${fillClass}`} style={{ width: `${pct}%` }} />
      <div className="absolute inset-0" style={{ backgroundImage: tickBackground(ticks) }} />
      {warded && <div className="hp-ward absolute inset-0" />}
      {hitKey > 0 && <span key={hitKey} className="hp-ward-hit absolute inset-0" />}
    </div>
  )
}

/** Heater shield with a four-point rune, the emblem of the temp-HP ward. */
function WardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="hp-ward-icon size-4 shrink-0" aria-hidden>
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

/** Resilience: a flame of stamina. */
function ResilienceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-trim" aria-hidden>
      <path
        d="M12 2.5c.6 3.2 4.8 5.4 4.8 10.3a4.8 4.8 0 0 1-9.6 0c0-2.4 1.3-3.8 2.3-5 .2 1.6.9 2.6 2 3.1-.5-3.3-.1-5.8.5-8.4Z"
        fill="currentColor"
      />
      <path d="M12 21.5a3.2 3.2 0 0 1-3.2-3.2c0-1.9 1.9-3 2.4-4.8.9 1.2 4 2.4 4 4.8a3.2 3.2 0 0 1-3.2 3.2Z" fill="var(--color-surface)" opacity="0.55" />
    </svg>
  )
}

/** Hit points: a heart. */
function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-danger" aria-hidden>
      <path d="M12 20.5S3.5 15.3 3.5 9.2A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.5 2.7c0 6.1-8.5 11.3-8.5 11.3Z" fill="currentColor" />
    </svg>
  )
}

/** Left-hand caption cell of a vitals row. */
function RowCaption({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-fg-muted">
      {icon}
      {children}
    </span>
  )
}

/** A number that reads as plain text until hovered or focused, then shows it's editable. */
const quietInput =
  'rounded bg-transparent px-0.5 text-center font-num outline-1 outline-transparent transition-colors hover:bg-white/5 hover:outline-border focus:bg-surface-2 focus:outline-trim/60'

/**
 * One pool as a row of the vitals grid: caption, bar (a slider when editable), and −/value/+.
 * Every pool is adjustable on its own, since some effects hit exactly one of them.
 */
function PoolRow({
  icon,
  label,
  ariaLabel,
  current,
  max,
  onSet,
  numberClass,
  heightClass,
  fillClass,
  ticks,
  warded,
  hitKey,
}: {
  icon: ReactNode
  label: string
  ariaLabel: string
  current: number
  max: number
  onSet?: (next: number) => void
  numberClass: string
  heightClass: string
  fillClass: (pct: number) => string
  ticks: number
  warded?: boolean
  hitKey?: number
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
  const track = (p: number) => <BarTrack pct={p} fillClass={fillClass(p)} ticks={ticks} warded={warded} hitKey={hitKey} />

  return (
    <>
      <RowCaption icon={icon}>{label}</RowCaption>
      {onSet ? (
        <BarSlider key={current} current={current} max={max} onCommit={onSet} ariaLabel={ariaLabel} heightClass={heightClass}>
          {track}
        </BarSlider>
      ) : (
        <div className={`relative ${heightClass}`}>{track(pct)}</div>
      )}
      <div className="flex items-center justify-end gap-0.5">
        {onSet && <StepButton direction={-1} label={label} disabled={current <= 0} onStep={(d) => onSet(stepWithin(current, d, 0, max))} />}
        <span className={`flex min-w-11 items-baseline justify-center font-num leading-none text-fg ${numberClass}`}>
          {onSet ? <EditableNumber key={current} value={current} max={max} onCommit={onSet} className={`w-[1.9em] ${quietInput}`} /> : current}
          <span className="text-[0.7em] font-medium text-fg-muted">/{max}</span>
        </span>
        {onSet && <StepButton direction={1} label={label} disabled={current >= max} onStep={(d) => onSet(stepWithin(current, d, 0, max))} />}
      </div>
    </>
  )
}

/**
 * The vitals HUD minus the armor/evasion emblems: the life-force pools in the middle, and a right
 * column with the given `stats` plates above hit dice and exhaustion. Returns both columns as
 * siblings so the panel's flex layout can wrap them independently.
 */
export function HitPoints({
  character,
  characterPath,
  stats,
}: {
  character: CharacterFrontmatter
  characterPath: string
  stats: ReactNode
}) {
  const t = useT()
  const { current, max, temp = 0 } = character.hp
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

  // One setter per pool; each is undefined when that pool can't be written (no permission, or no
  // known place on disk), which the controls read as "display only".
  const editable = <T,>(target: T | undefined) => (canEdit && target ? target : undefined)
  const hpTarget = editable(writeTargets?.hp_current)
  const tempTarget = editable(writeTargets?.hp_temp)
  const resilienceTarget = editable(writeTargets?.resilience_current)
  const exhaustionTarget = editable(writeTargets?.exhaustion)

  const setHp =
    hpTarget &&
    ((next: number) => void updateCharacterField(characterPath, hpTarget, next, (c) => ({ ...c, hp: { ...c.hp, current: next } })))
  const setTemp =
    tempTarget &&
    ((next: number) => void updateCharacterField(characterPath, tempTarget, next, (c) => ({ ...c, hp: { ...c.hp, temp: next } })))
  const setResilience =
    resilienceTarget &&
    ((next: number) =>
      void updateCharacterField(characterPath, resilienceTarget, next, (c) =>
        c.resilience ? { ...c, resilience: { ...c.resilience, current: next } } : c,
      ))
  const setExhaustion =
    exhaustionTarget &&
    ((next: number) =>
      void updateCharacterField(characterPath, exhaustionTarget, next, (c) => ({ ...c, conditions: { ...c.conditions, exhaustion: next } })))

  const resilience =
    typeof character.resilience?.current === 'number' && typeof character.resilience.max === 'number' ? character.resilience : undefined
  const exhaustion = character.conditions?.exhaustion ?? 0
  const exhaustionMax = character.conditions?.exhaustion_max ?? DEFAULT_EXHAUSTION_MAX
  const showExhaustion = Boolean(writeTargets?.exhaustion) || character.conditions?.exhaustion !== undefined

  // Damage order (vault rule `Schaden erleiden`): temp HP → resilience → HP. Temp HP are lost
  // before either pool (`Temporäre Trefferpunkte`), so the ward wraps both bars.
  const warded = temp > 0

  // Temp HP don't stack (rules: you keep the old value or take the new one), so there's no "+":
  // type a new value to replace them, or knock them down with "−".
  const tempLabel = t('stats.tempHp')
  const tempControl = (setTemp || temp > 0) && (
    <span className={`hp-ward-chip flex items-center gap-1 rounded-md py-0.5 pr-2 pl-1 text-accent ${temp > 0 ? 'is-active' : ''}`} title={tempLabel}>
      <WardIcon />
      {setTemp && <StepButton direction={-1} label={tempLabel} tone="accent" disabled={temp <= 0} onStep={(d) => setTemp(stepWithin(temp, d, 0))} />}
      {setTemp ? (
        <EditableNumber key={temp} value={temp} onCommit={setTemp} className={`w-8 text-base leading-tight ${quietInput}`} />
      ) : (
        <span className="font-num text-base leading-tight">{temp}</span>
      )}
      <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em]">{t('stats.temp')}</span>
    </span>
  )

  return (
    <>
      <div className="min-w-0 grow-[2] basis-[26rem]">
        <div className="mb-2 flex min-h-7 items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.16em] text-trim">
            <span aria-hidden className="size-1.5 rotate-45 bg-trim" />
            {t('cards.vitals')}
          </h2>
          {tempControl}
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
          {resilience && (
            <PoolRow
              icon={<ResilienceIcon />}
              label={t('stats.resilience')}
              ariaLabel={t('a11y.currentResilience')}
              current={resilience.current}
              max={resilience.max}
              onSet={setResilience}
              numberClass="text-lg"
              heightClass="h-2.5"
              fillClass={() => 'rp-fill'}
              ticks={resilience.max > 0 && resilience.max <= 30 ? resilience.max : 10}
              warded={warded}
              hitKey={wardHitKey}
            />
          )}
          <PoolRow
            icon={<HeartIcon />}
            label={t('cards.hitPoints')}
            ariaLabel={t('a11y.currentHp')}
            current={current}
            max={max}
            onSet={setHp}
            numberClass="text-xl"
            heightClass="h-3.5"
            fillClass={(p) => `bg-linear-to-r ${hpFillClass(p)}`}
            ticks={10}
            warded={warded}
            hitKey={wardHitKey}
          />
        </div>
      </div>

      <div className="flex min-w-0 grow basis-64 flex-col gap-2.5">
        {stats}
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 border-t border-trim/15 pt-2">
          <RowCaption>{t('stats.hitDice')}</RowCaption>
          <span className="flex items-center justify-end gap-1 font-num text-sm text-fg">
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
                className={`w-6 ${quietInput}`}
              />
            ) : (
              hitDiceRemaining
            )}
            <span className="text-fg-muted">
              /{hitDiceTotal} {character.hit_dice.die}
            </span>
            <DamageRollButton label={t('roll.hitDie')} dice={`1${character.hit_dice.die}`} bonus={conMod} />
          </span>

          {showExhaustion && (
            <ExhaustionTrack
              level={exhaustion}
              max={exhaustionMax}
              onChange={setExhaustion}
              caption={<RowCaption>{t('stats.exhaustion')}</RowCaption>}
            />
          )}
        </div>
      </div>
    </>
  )
}
