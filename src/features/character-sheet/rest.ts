import type { CharacterFrontmatter, CharacterWriteTargets, FieldWriteTarget } from '../../vault/types'
import { resiliencePool } from './vitals'

/**
 * Rests and what they restore. Endeavour characters (those with resilience points or Nimble
 * attributes) follow the vault's `Regeln/Umgebung/Rasten` notes; everyone else gets the D&D 2024
 * long rest.
 *
 * - `breather` (Verschnaufen, 10 min, 2×/day): 50 % of max RP.
 * - `field` (Feldrast, 8 h in camp, 1×/day): all RP, 25 % of max HP, half the max mana (slot casters:
 *   half of each grade's slots). Exhaustion stays.
 * - `safe` (Sichere Rast, 8 h at a safe place, 1×/day): all RP, 50 % of max HP, all mana and slots,
 *   one exhaustion level. Temp HP end with it (`Temporäre Trefferpunkte#Wirkungsdauer`).
 * - `long` (D&D 2024 long rest): all HP, hit dice and slots, one exhaustion level, temp HP end.
 *
 * Every percentage rounds down, as the rules say.
 */
export type RestKind = 'breather' | 'field' | 'safe' | 'long'

export type RestChangeKey = 'resilience' | 'hp' | 'temp' | 'mana' | 'exhaustion' | 'slot' | 'hitDice'

/** One pool a rest changes. `from`/`to` are what the sheet shows: remaining slots and hit dice, not used ones. */
export interface RestChange {
  key: RestChangeKey
  from: number
  to: number
  max?: number
  /** Spell grade, for `slot`. */
  grade?: string
}

export function isEndeavourCharacter(character: CharacterFrontmatter): boolean {
  return Boolean(character.resilience || character.nimble_attributes)
}

export function restKinds(character: CharacterFrontmatter): RestKind[] {
  return isEndeavourCharacter(character) ? ['breather', 'field', 'safe'] : ['long']
}

/** `current + gain`, capped at `max` — never lowers a pool that's somehow above max already. */
function regain(current: number, gain: number, max: number): number {
  return Math.max(current, Math.min(max, current + gain))
}

export function planRest(character: CharacterFrontmatter, kind: RestKind): RestChange[] {
  const changes: RestChange[] = []
  const push = (change: RestChange) => {
    if (change.to !== change.from) changes.push(change)
  }

  const rp = resiliencePool(character)
  const { current: hp, max: hpMax, temp = 0 } = character.hp
  const mana = character.spellcasting?.mana
  const slots = Object.entries(character.spellcasting?.slots ?? {}).sort(([a], [b]) => Number(a) - Number(b))
  const exhaustion = character.conditions?.exhaustion ?? 0
  const hitDice = character.hit_dice

  // What share of each pool comes back; `undefined` leaves the pool alone.
  const share = {
    breather: { rp: 0.5, hp: undefined, magic: undefined, exhaustion: 0, clearsTemp: false },
    field: { rp: 1, hp: 0.25, magic: 0.5, exhaustion: 0, clearsTemp: false },
    safe: { rp: 1, hp: 0.5, magic: 1, exhaustion: 1, clearsTemp: true },
    long: { rp: 1, hp: 1, magic: 1, exhaustion: 1, clearsTemp: true },
  }[kind]

  if (rp) push({ key: 'resilience', from: rp.current, to: regain(rp.current, Math.floor(rp.max * share.rp), rp.max), max: rp.max })
  if (share.hp !== undefined) push({ key: 'hp', from: hp, to: regain(hp, Math.floor(hpMax * share.hp), hpMax), max: hpMax })
  if (share.clearsTemp) push({ key: 'temp', from: temp, to: 0 })

  if (share.magic !== undefined) {
    if (mana) push({ key: 'mana', from: mana.current, to: regain(mana.current, Math.floor(mana.max * share.magic), mana.max), max: mana.max })
    for (const [grade, { max, used }] of slots) {
      const remaining = max - used
      push({ key: 'slot', grade, from: remaining, to: regain(remaining, Math.floor(max * share.magic), max), max })
    }
  }

  if (share.exhaustion > 0) push({ key: 'exhaustion', from: exhaustion, to: Math.max(0, exhaustion - share.exhaustion) })

  if (kind === 'long' && hitDice) {
    const remaining = hitDice.total - (hitDice.used ?? 0)
    push({ key: 'hitDice', from: remaining, to: hitDice.total, max: hitDice.total })
  }

  return changes
}

/** Where a change is saved, and the logical value `updateCharacterField` writes for it. */
export function restChangeWrite(change: RestChange, targets: CharacterWriteTargets | undefined): { target: FieldWriteTarget; value: number } | undefined {
  const target = {
    resilience: targets?.resilience_current,
    hp: targets?.hp_current,
    temp: targets?.hp_temp,
    mana: targets?.mana_current,
    exhaustion: targets?.exhaustion,
    slot: change.grade !== undefined ? targets?.spell_slots?.[change.grade] : undefined,
    hitDice: targets?.hit_dice_remaining,
  }[change.key]
  if (!target) return undefined
  // Slots are stored as `used`; everything else as the value the sheet shows.
  const value = change.key === 'slot' ? (change.max ?? 0) - change.to : change.to
  return { target, value }
}

/** The character after one change, for the store's optimistic update. */
export function applyRestChange(c: CharacterFrontmatter, change: RestChange): CharacterFrontmatter {
  switch (change.key) {
    case 'resilience':
      return c.resilience ? { ...c, resilience: { ...c.resilience, current: change.to } } : c
    case 'hp':
      return { ...c, hp: { ...c.hp, current: change.to } }
    case 'temp':
      return { ...c, hp: { ...c.hp, temp: change.to } }
    case 'mana':
      return c.spellcasting?.mana ? { ...c, spellcasting: { ...c.spellcasting, mana: { ...c.spellcasting.mana, current: change.to } } } : c
    case 'exhaustion':
      return { ...c, conditions: { ...c.conditions, exhaustion: change.to } }
    case 'slot': {
      const slot = change.grade !== undefined ? c.spellcasting?.slots?.[change.grade] : undefined
      if (!slot || !c.spellcasting?.slots) return c
      return { ...c, spellcasting: { ...c.spellcasting, slots: { ...c.spellcasting.slots, [change.grade!]: { ...slot, used: slot.max - change.to } } } }
    }
    case 'hitDice':
      return c.hit_dice ? { ...c, hit_dice: { ...c.hit_dice, used: c.hit_dice.total - change.to } } : c
  }
}
