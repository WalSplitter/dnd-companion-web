import { formatDiceExpression, parseDiceExpression } from '../../dice/notation'
import { abilityModifier, nimbleAttributeValue, totalCharacterLevel } from '../../vault/deriveStats'
import { ABILITY_TO_NIMBLE_ATTRIBUTE, type CharacterFrontmatter, type SpellFrontmatter } from '../../vault/types'

/**
 * Who rolls what when a spell is cast:
 * - `attack`: the caster rolls a spell attack, then damage on a hit.
 * - `save`: the DM rolls a saving throw for each target against the caster's spell DC — the spell
 *   always lands, the save only softens or stops its effect. The caster just rolls damage.
 * - `auto`: the spell hits without any roll (e.g. Magisches Geschoss, or an area that simply
 *   damages everything in it); only damage is rolled.
 * - `none`: nothing to roll (buffs, utility).
 */
export type SpellRollFlow = 'attack' | 'save' | 'auto' | 'none'

export function spellRollFlow(fm: SpellFrontmatter, damage: string | undefined): SpellRollFlow {
  if (fm.save_ability) return 'save'
  if (fm.attack_roll === true) return 'attack'
  if (!damage) return 'none'
  if (fm.attack_roll === false) return 'auto'
  // Nimble areas without a save ("4d12 to all adjacent creatures") just hit everything in them.
  return fm.target_kind === 'aoe' ? 'auto' : 'attack'
}

// German and English words for an area of effect, as the vault writes them in `range`/`target`
// ("Selbst (4,5-m-Kegel)", "Radius 3 Meter", "Alle Kreaturen im Kegel", `Ziel: AoE`).
const AREA_RE = /\b(aoe|kegel|radius|linie|würfel|kugel|zylinder|ausströmung|cone|sphere|cube|line|cylinder|emanation)\b|alle kreaturen|jede kreatur/i

/** Whether the spell covers an area rather than picking single targets. */
export function isAreaSpell(fm: SpellFrontmatter): boolean {
  if (fm.target_kind) return fm.target_kind === 'aoe'
  return AREA_RE.test(`${fm.range} ${fm.target ?? ''}`)
}

/**
 * Nimble's KEY: the spellcasting attribute's value — the Nimble attribute on an Endeavour sheet
 * (VS +3), otherwise the D&D ability modifier.
 */
export function spellKeyValue(character: CharacterFrontmatter): number {
  const ability = character.spellcasting?.ability
  if (!ability) return 0
  return character.nimble_attributes
    ? nimbleAttributeValue(character, ABILITY_TO_NIMBLE_ATTRIBUTE[ability])
    : abilityModifier(character.abilities[ability])
}

/**
 * Fills in Nimble's placeholders: `KEY` (spellcasting attribute) and `LVL` (character level), as a
 * flat bonus (`1d12+KEY`) or a dice count (`KEY d20`, `KEYd20` — at least one die). Then tidies
 * signs, so `1d12+KEY` with KEY −1 reads `1d12-1`.
 */
export function resolveSpellFormula(formula: string, { key, level }: { key: number; level: number }): string {
  return formula
    .replace(/\bKEY\s*([dw]\d+)/gi, (_, die: string) => `${Math.max(1, key)}${die}`)
    .replace(/\bLVL\s*([dw]\d+)/gi, (_, die: string) => `${Math.max(1, level)}${die}`)
    .replace(/\bKEY\b/gi, String(key))
    .replace(/\bLVL\b/gi, String(level))
    .replace(/\s+/g, '')
    .replace(/\+-/g, '-')
    .replace(/-\+/g, '-')
    .replace(/--/g, '+')
}

/**
 * The damage formula for a cast at `tier`: the base damage plus `upcast_damage` once per tier above
 * the spell's own, merged into one tidy formula (`4d12` + 2 × `+1d12` → `6d12`). Returns the plain
 * resolved base when the upcast part isn't rollable.
 */
export function upcastDamage(base: string, upcast: string | undefined, steps: number): string {
  if (!upcast || steps <= 0) return base
  const expression = parseDiceExpression(base)
  const extra = parseDiceExpression(upcast)
  if (!expression || !extra) return base
  for (let i = 0; i < steps; i++) {
    for (const { count, sides } of extra.dice) {
      const same = expression.dice.find((d) => d.sides === sides)
      if (same) same.count += count
      else expression.dice.push({ count, sides })
    }
    expression.modifier += extra.modifier
  }
  return formatDiceExpression(expression)
}

/** A cantrip's dice at the character's level (`damage_scaling` breakpoints), otherwise `damage`. */
export function scaledDamage(fm: SpellFrontmatter, characterLevel: number): string | undefined {
  if (fm.level !== 0 || !fm.damage_scaling) return fm.damage
  const applicable = fm.damage_scaling.filter((s) => s.at_level <= characterLevel).sort((a, b) => b.at_level - a.at_level)
  return applicable[0]?.dice ?? fm.damage
}

/** The damage to roll for a cast at `tier`, placeholders resolved. */
export function spellDamage(character: CharacterFrontmatter, fm: SpellFrontmatter, tier: number): string | undefined {
  const level = totalCharacterLevel(character)
  const base = scaledDamage(fm, level)
  if (!base) return undefined
  const vars = { key: spellKeyValue(character), level }
  const resolved = resolveSpellFormula(base, vars)
  const upcast = fm.upcast_damage ? resolveSpellFormula(fm.upcast_damage, vars) : undefined
  return upcastDamage(resolved, upcast, tier - fm.level)
}

/** Highest tier this character can cast at: `max_tier`, else the highest tier they know a spell of. */
export function highestTier(character: CharacterFrontmatter, knownTiers: number[]): number {
  return character.spellcasting?.max_tier ?? Math.max(0, ...knownTiers)
}

/** Whether the spell is one of Nimble's utility spells (no tier, no mana). */
export function isUtilitySpell(fm: SpellFrontmatter): boolean {
  return fm.utility === true
}

/**
 * What casting a spell spends: mana when the character has a mana pool (by default its tier, and the
 * chosen tier when upcast), else a slot of its grade. `tiers` is the range a cast can be made at:
 * the spell's own tier up to the highest unlocked one — only for mana, only for tiered spells.
 */
export type SpellCost =
  | { kind: 'mana'; cost: number; affordable: boolean; tiers: { min: number; max: number }; locked: boolean }
  | { kind: 'slot'; grade: string; affordable: boolean }

export function spellCost(character: CharacterFrontmatter, fm: SpellFrontmatter, maxTier: number, tier = fm.level): SpellCost | undefined {
  const mana = character.spellcasting?.mana
  if (mana) {
    if (isUtilitySpell(fm) || (fm.level === 0 && !fm.mana_cost)) return undefined
    // An explicit cost stays fixed at the spell's own tier and grows by one per tier upcast.
    const cost = (fm.mana_cost ?? fm.level) + (tier - fm.level)
    const locked = fm.level > maxTier
    const tiers = { min: fm.level, max: Math.max(fm.level, fm.level === 0 ? 0 : maxTier) }
    return { kind: 'mana', cost, affordable: !locked && mana.current >= cost, tiers, locked }
  }
  if (fm.level === 0) return undefined
  const slot = character.spellcasting?.slots?.[String(fm.level)]
  return slot ? { kind: 'slot', grade: String(fm.level), affordable: slot.used < slot.max } : undefined
}
