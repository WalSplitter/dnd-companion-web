import { renderObsidianBody } from '../../../vault/components/renderObsidian'
import { spellAttackBonus, spellSaveDC } from '../../../vault/deriveStats'
import type { CharacterFrontmatter, SpellFrontmatter, VaultFile } from '../../../vault/types'
import type { VaultIndex } from '../../../vault/wikilinks'
import { resolveSpellLink } from '../../../vault/wikilinks'
import { D20RollButton, DamageRollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'

export function SpellList({ links, index, character }: { links: string[]; index: VaultIndex; character: CharacterFrontmatter }) {
  const t = useT()
  const resolved = links
    .map((link) => resolveSpellLink(index, link))
    .filter((s): s is VaultFile<SpellFrontmatter> => Boolean(s))

  const byLevel = new Map<number, VaultFile<SpellFrontmatter>[]>()
  for (const spell of resolved) {
    const level = spell.frontmatter.level
    if (!byLevel.has(level)) byLevel.set(level, [])
    byLevel.get(level)!.push(spell)
  }

  const levels = [...byLevel.keys()].sort((a, b) => a - b)

  if (levels.length === 0) {
    return <p className="text-sm text-fg-muted">{t('spells.noSpellsKnown')}</p>
  }

  const dc = spellSaveDC(character)
  const attack = spellAttackBonus(character)
  const totalLevel = character.class.reduce((sum, c) => sum + c.level, 0)

  return (
    <div className="space-y-4">
      {levels.map((level) => {
        const slot = character.spellcasting?.slots?.[String(level)]
        return (
          <div key={level}>
            <h3 className="mb-1.5 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wide text-fg-muted">
              {level === 0 ? t('spells.cantrips') : t('spells.level', { level })}
              {slot && (
                <span className={`text-xs normal-case ${slot.used >= slot.max ? 'text-danger' : 'text-fg-muted/70'}`}>
                  {t('spells.slotsRemaining', { remaining: slot.max - slot.used, max: slot.max })}
                </span>
              )}
            </h3>
            <ul className="space-y-1.5">
              {byLevel
                .get(level)!
                .sort((a, b) => a.frontmatter.name.localeCompare(b.frontmatter.name))
                .map((spell) => (
                  <SpellRow key={spell.path} spell={spell} characterLevel={totalLevel} saveDC={dc} attackBonus={attack} />
                ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function scaledDamage(fm: SpellFrontmatter, characterLevel: number): string | undefined {
  if (fm.level !== 0 || !fm.damage_scaling) return fm.damage
  const applicable = fm.damage_scaling.filter((s) => s.at_level <= characterLevel).sort((a, b) => b.at_level - a.at_level)
  return applicable[0]?.dice ?? fm.damage
}

function SpellRow({
  spell,
  characterLevel,
  saveDC,
  attackBonus,
}: {
  spell: VaultFile<SpellFrontmatter>
  characterLevel: number
  saveDC: number | undefined
  attackBonus: number | undefined
}) {
  const t = useT()
  const fm = spell.frontmatter
  const damage = scaledDamage(fm, characterLevel)
  const isAttackSpell = damage !== undefined && !fm.save_ability

  return (
    <li className="rounded-lg border border-border bg-surface-2">
      <details>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 p-2.5 text-sm marker:content-none">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
            {fm.level === 0 ? t('spells.cantripBadge') : t('spells.levelBadge', { level: fm.level })}
          </span>
          <span className="font-semibold text-fg">{fm.name}</span>
          <span className="text-xs italic text-fg-muted">{fm.school}</span>
          {fm.concentration && (
            <span className="rounded border border-border px-1 text-[10px] uppercase text-fg-muted" title={t('spells.concentration')}>
              C
            </span>
          )}
          {fm.ritual && (
            <span className="rounded border border-border px-1 text-[10px] uppercase text-fg-muted" title={t('spells.ritual')}>
              R
            </span>
          )}
          {damage && (
            <span className="text-xs text-fg-muted">
              {damage}
              {fm.damage_type ? ` ${fm.damage_type}` : ''}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5">
            {fm.save_ability && saveDC !== undefined && (
              <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs text-fg-muted">
                {t('spells.saveBadge', { dc: saveDC, ability: fm.save_ability.toUpperCase() })}
              </span>
            )}
            {isAttackSpell && attackBonus !== undefined && (
              <D20RollButton label={t('roll.attackSuffix', { name: fm.name })} modifier={attackBonus} />
            )}
            {damage && <DamageRollButton label={t('roll.damageSuffix', { name: fm.name })} dice={damage} damageType={fm.damage_type} />}
          </span>
        </summary>
        <div className="border-t border-border p-2.5 pt-2">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-fg-muted sm:grid-cols-4">
            <div>
              <dt className="uppercase">{t('spells.castingTime')}</dt>
              <dd className="text-fg">{fm.casting_time}</dd>
            </div>
            <div>
              <dt className="uppercase">{t('spells.range')}</dt>
              <dd className="text-fg">{fm.range}</dd>
            </div>
            <div>
              <dt className="uppercase">{t('spells.components')}</dt>
              <dd className="text-fg">{fm.components.join(', ')}</dd>
            </div>
            <div>
              <dt className="uppercase">{t('spells.duration')}</dt>
              <dd className="text-fg">{fm.duration}</dd>
            </div>
            {fm.target && (
              <div>
                <dt className="uppercase">{t('spells.target')}</dt>
                <dd className="text-fg">{fm.target}</dd>
              </div>
            )}
          </dl>
          {spell.body && <div className="mt-2 text-sm text-fg">{renderObsidianBody(spell.body)}</div>}
        </div>
      </details>
    </li>
  )
}
