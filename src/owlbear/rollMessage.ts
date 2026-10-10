/**
 * Rolls made on a linked character's sheet go to everyone in the Owlbear Rodeo room. The companion
 * broadcasts them; every background page (see `rollFx.ts`) plays an effect on that character's
 * tokens for attacks and damage, and shows other rolls as a notification.
 */
export const ROLL_CHANNEL = 'dnd-companion/roll'

export interface SharedRoll {
  /** Character the roll was made for — its linked tokens show the effect. */
  character: string
  /** Owlbear name of the player who rolled. */
  player: string
  /** `attack` is a d20 attack roll (weapon or spell); `d20` any other check or save. */
  kind: 'd20' | 'attack' | 'damage'
  label: string
  total: number
  rolls: number[]
  modifier: number
  /** A natural 20 — or, for damage, a critical hit (doubled dice). */
  critical?: boolean
  /** A natural 1. */
  fumble?: boolean
  damageType?: string
  /** Shown to the GM only (and played on their screen only). */
  hidden?: boolean
}

export function isSharedRoll(value: unknown): value is SharedRoll {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.character === 'string' && typeof v.label === 'string' && typeof v.total === 'number' && Array.isArray(v.rolls) && (v.kind === 'd20' || v.kind === 'attack' || v.kind === 'damage')
}

const signed = (n: number) => (n < 0 ? ` − ${-n}` : ` + ${n}`)

/** One line, without words to translate: the background page has no language of its own. */
export function describe(roll: SharedRoll): string {
  const icon = roll.kind === 'damage' ? '⚔' : roll.kind === 'attack' ? '🎯' : '🎲'
  const flag = roll.critical ? ' ✦' : roll.fumble ? ' ✗' : ''
  const detail = `[${roll.rolls.join(', ')}]${roll.modifier ? signed(roll.modifier) : ''}`
  const type = roll.damageType ? ` · ${roll.damageType}` : ''
  return `${roll.hidden ? '🔒 ' : ''}${icon} ${roll.character} · ${roll.label}${type}: ${roll.total}${flag}  ${detail}`
}

/** Damage types by the words the vault uses for them (German and English). */
const TYPE_COLORS: [RegExp, string][] = [
  [/feuer|fire/i, '#ff7a1a'],
  [/kälte|kaelte|cold/i, '#5cc8ff'],
  [/blitz|lightning/i, '#ffe14d'],
  [/donner|schall|thunder/i, '#7aa2ff'],
  [/gift|poison/i, '#5bd65b'],
  [/säure|saeure|acid/i, '#b5e61d'],
  [/nekro|necrotic/i, '#9b59ff'],
  [/gleißend|gleissend|strahl|radiant/i, '#fff3b0'],
  [/psych/i, '#ff5cd6'],
  [/energie|kraft|force/i, '#c084fc'],
]
const DEFAULT_COLOR = '#e8b84a'
const CRITICAL_COLOR = '#ff4d4d'

/** Colours of the attack effect — apart from every damage type, so the two never look alike. */
export const AIM_COLORS = { hit: '#3ee6c4', critical: '#ffd23f', fumble: '#9aa0a6' } as const

export function aimColor(roll: Pick<SharedRoll, 'critical' | 'fumble'>): string {
  return roll.critical ? AIM_COLORS.critical : roll.fumble ? AIM_COLORS.fumble : AIM_COLORS.hit
}

export function burstColor(roll: Pick<SharedRoll, 'critical' | 'damageType'>): string {
  if (roll.critical) return CRITICAL_COLOR
  return TYPE_COLORS.find(([pattern]) => pattern.test(roll.damageType ?? ''))?.[1] ?? DEFAULT_COLOR
}
