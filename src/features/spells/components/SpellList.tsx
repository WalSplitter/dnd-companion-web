import { useState, type ReactNode } from 'react'
import { renderObsidianBody } from '../../../vault/components/renderObsidian'
import { spellAttackBonus, spellSaveDC, spellSaveDCPenalty } from '../../../vault/deriveStats'
import { D20Modifier, ExhaustedValue } from '../../../components/ExhaustedValue'
import { ABILITY_TO_NIMBLE_ATTRIBUTE, type CharacterFrontmatter, type SpellFrontmatter, type SpellTargetKind, type VaultFile } from '../../../vault/types'
import type { VaultIndex } from '../../../vault/wikilinks'
import { resolveSpellLink } from '../../../vault/wikilinks'
import { D20RollButton, DamageRollButton } from '../../../dice/RollButton'
import { AreaIcon, AutoHitIcon, CaptionedRoll, DieIcon, DmIcon, HitIcon, ROLL_BUTTON, StepArrow } from '../../../dice/RollGlyphs'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import { useCanEdit, useVaultStore } from '../../../store/vaultStore'
import { highestTier, isAreaSpell, isUtilitySpell, spellCost, spellDamage, spellRollFlow, type SpellCost } from '../spellRolls'

/** Group key for the utility spells, listed after every tier. */
const UTILITY = 'utility'

export function SpellList({
  links,
  index,
  character,
  characterPath,
}: {
  links: string[]
  index: VaultIndex
  character: CharacterFrontmatter
  characterPath?: string
}) {
  const t = useT()
  const cast = useCastSpell(character, characterPath)
  const resolved = links
    .map((link) => resolveSpellLink(index, link))
    .filter((s): s is VaultFile<SpellFrontmatter> => Boolean(s))

  const groups = new Map<number | typeof UTILITY, VaultFile<SpellFrontmatter>[]>()
  for (const spell of resolved) {
    const key = isUtilitySpell(spell.frontmatter) ? UTILITY : spell.frontmatter.level
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(spell)
  }
  const keys = [...groups.keys()].sort((a, b) => (a === UTILITY ? 1 : b === UTILITY ? -1 : a - b))

  if (keys.length === 0) {
    return <p className="text-sm text-fg-muted">{t('spells.noSpellsKnown')}</p>
  }

  const maxTier = highestTier(
    character,
    resolved.filter((s) => !isUtilitySpell(s.frontmatter)).map((s) => s.frontmatter.level),
  )
  const hasMana = Boolean(character.spellcasting?.mana)
  const dc = spellSaveDC(character)
  const dcPenalty = spellSaveDCPenalty(character)
  const attack = spellAttackBonus(character)
  // Nimble sheets name saves by their own attributes (BW, not DEX).
  const saveLabel = (ability: SpellFrontmatter['save_ability']) =>
    ability ? (character.nimble_attributes ? ABILITY_TO_NIMBLE_ATTRIBUTE[ability] : ability).toUpperCase() : ''

  return (
    <div className="space-y-4">
      {keys.map((key) => {
        const slot = key !== UTILITY ? character.spellcasting?.slots?.[String(key)] : undefined
        const locked = hasMana && key !== UTILITY && key > maxTier
        return (
          <div key={key} className={locked ? 'opacity-60' : undefined}>
            <h3 className="mb-1.5 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wide text-fg-muted">
              {key === UTILITY ? t('spells.utility') : key === 0 ? t('spells.cantrips') : t('spells.level', { level: key })}
              {key !== UTILITY && key > 0 && hasMana && !locked && (
                <span className="mana-caption text-xs normal-case">{t('spells.tierCost', { cost: key })}</span>
              )}
              {locked && <span className="text-xs normal-case text-danger">{t('spells.tierLocked', { max: maxTier })}</span>}
              {slot && (
                <span className={`text-xs normal-case ${slot.used >= slot.max ? 'text-danger' : 'text-fg-muted/70'}`}>
                  {t('spells.slotsRemaining', { remaining: slot.max - slot.used, max: slot.max })}
                </span>
              )}
            </h3>
            <ul className="space-y-1.5">
              {groups
                .get(key)!
                .sort((a, b) => a.frontmatter.name.localeCompare(b.frontmatter.name))
                .map((spell) => (
                  <SpellRow
                    key={spell.path}
                    spell={spell}
                    character={character}
                    maxTier={maxTier}
                    saveDC={dc}
                    saveDCPenalty={dcPenalty}
                    saveLabel={saveLabel(spell.frontmatter.save_ability)}
                    attackBonus={attack}
                    onCast={cast}
                  />
                ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

/** Pays for a spell from the mana pool or a slot of its grade; `undefined` when nothing can be saved. */
function useCastSpell(character: CharacterFrontmatter, characterPath: string | undefined) {
  const canEdit = useCanEdit() && Boolean(characterPath)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  if (!canEdit) return undefined

  return (cost: SpellCost) => {
    const spellcasting = character.spellcasting
    if (!cost.affordable || !spellcasting) return
    if (cost.kind === 'mana') {
      const target = character._write?.mana_current
      const mana = spellcasting.mana
      if (!target || !mana) return
      const next = mana.current - cost.cost
      void updateCharacterField(characterPath!, target, next, (c) =>
        c.spellcasting?.mana ? { ...c, spellcasting: { ...c.spellcasting, mana: { ...c.spellcasting.mana, current: next } } } : c,
      )
    } else {
      const target = character._write?.spell_slots?.[cost.grade]
      const slot = spellcasting.slots?.[cost.grade]
      if (!target || !slot) return
      const used = slot.used + 1
      void updateCharacterField(characterPath!, target, used, (c) =>
        c.spellcasting?.slots?.[cost.grade] ? { ...c, spellcasting: { ...c.spellcasting, slots: { ...c.spellcasting.slots, [cost.grade]: { ...slot, used } } } } : c,
      )
    }
  }
}

/** A tiny mana orb, half full, with a rune tick on top: what the spell costs from the pool. */
function ManaOrbIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" aria-hidden>
      <circle cx="8" cy="9" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.1 9.6q2.4-1.2 4.9 0t4.9 0A4.9 4.9 0 0 1 3.1 9.6Z" fill="currentColor" />
      <path d="M5.4 6.4a3 3 0 0 1 1.8-1.4" fill="none" stroke="rgb(255 255 255 / 0.7)" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M8 .6v1.8M6.6 1.5h2.8" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  )
}

/** A small facetted crystal: casting spends a spell slot. */
function SlotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3 shrink-0" aria-hidden>
      <path d="M12 1.5 20.5 7.5v9L12 22.5 3.5 16.5v-9Z" fill="currentColor" />
      <path d="M3.5 7.5 12 11l8.5-3.5M12 11v11.5" fill="none" stroke="rgb(255 255 255 / 0.5)" strokeWidth="1.2" />
    </svg>
  )
}

/** Stops a click inside `<summary>` from also opening/closing the spell's details. */
function stop(e: React.MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
}

/**
 * What casting costs, as a button that pays it: mana orb + amount, or a crystal for a slot. Turns
 * red when the pool can't pay; read-only (no button) without edit permission. A tiered mana spell
 * gets ‹ › around it to upcast (Nimble: pick any tier up to the highest unlocked, pay that tier).
 */
function CastControl({
  cost,
  tier,
  baseTier,
  onTier,
  spellName,
  onCast,
}: {
  cost: SpellCost
  tier: number
  baseTier: number
  onTier: (tier: number) => void
  spellName: string
  onCast?: (cost: SpellCost) => void
}) {
  const t = useT()
  const [castKey, setCastKey] = useState(0)
  const upcastable = cost.kind === 'mana' && !cost.locked && cost.tiers.max > cost.tiers.min
  const upcast = tier > baseTier
  const content = (
    <>
      {cost.kind === 'mana' ? <ManaOrbIcon /> : <SlotIcon />}
      {cost.kind === 'mana' ? cost.cost : t('spells.slotShort', { level: cost.grade })}
    </>
  )
  const title =
    cost.kind === 'mana' && cost.locked
      ? t('spells.lockedHint', { tier: baseTier })
      : cost.affordable
        ? t(cost.kind === 'mana' ? (upcast ? 'spells.castUpcastHint' : 'spells.castManaHint') : 'spells.castSlotHint', {
            name: spellName,
            cost: cost.kind === 'mana' ? cost.cost : cost.grade,
            tier,
          })
        : t(cost.kind === 'mana' ? 'spells.noMana' : 'spells.noSlot')
  const stateClass = `${cost.kind === 'mana' ? 'is-mana' : ''} ${cost.affordable ? '' : 'is-unaffordable'} ${upcast ? 'is-upcast' : ''}`

  const button = onCast ? (
    <button
      key={castKey}
      type="button"
      title={title}
      disabled={!cost.affordable}
      onClick={(e) => {
        stop(e)
        onCast(cost)
        setCastKey((k) => k + 1)
      }}
      className={`spell-cast ${stateClass} ${castKey > 0 ? 'is-casting' : ''}`}
    >
      {content}
    </button>
  ) : (
    <span title={title} className={`spell-cast is-readonly ${stateClass}`}>
      {content}
    </span>
  )

  const caption = upcast ? t('spells.upcastCaption', { tier }) : t('spells.castCaption')
  return (
    <CaptionedRoll caption={caption} className={cost.kind === 'mana' ? 'mana-caption' : 'text-accent/80'}>
      {upcastable ? (
        <span className="upcast-stepper">
          <button
            type="button"
            className="upcast-step"
            disabled={tier <= cost.tiers.min}
            aria-label={t('spells.upcastDown')}
            title={t('spells.upcastDown')}
            onClick={(e) => {
              stop(e)
              onTier(tier - 1)
            }}
          >
            ‹
          </button>
          {button}
          <button
            type="button"
            className="upcast-step"
            disabled={tier >= cost.tiers.max}
            aria-label={t('spells.upcastUp')}
            title={t('spells.upcastUp')}
            onClick={(e) => {
              stop(e)
              onTier(tier + 1)
            }}
          >
            ›
          </button>
        </span>
      ) : (
        button
      )}
    </CaptionedRoll>
  )
}

/** Nimble's action cost as pips: one small diamond per action point. */
function ActionPips({ actions }: { actions: number }) {
  const t = useT()
  return (
    <span className="ap-chip" title={t('spells.actionsHint', { n: actions })}>
      {actions === 0 ? (
        <span className="ap-free">0</span>
      ) : (
        Array.from({ length: Math.min(actions, 5) }, (_, i) => <span key={i} className="ap-pip" />)
      )}
      <span>{t('spells.apShort')}</span>
    </span>
  )
}

const TARGET_KEY: Record<SpellTargetKind, TranslationKey> = {
  single: 'spells.targetSingle',
  aoe: 'spells.area',
  self: 'spells.targetSelf',
  special: 'spells.targetSpecial',
}

function Chip({ children, title, className = '' }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border border-border px-1 text-[10px] uppercase text-fg-muted ${className}`} title={title}>
      {children}
    </span>
  )
}

function SpellRow({
  spell,
  character,
  maxTier,
  saveDC,
  saveDCPenalty,
  saveLabel,
  attackBonus,
  onCast,
}: {
  spell: VaultFile<SpellFrontmatter>
  character: CharacterFrontmatter
  maxTier: number
  saveDC: number | undefined
  /** How much exhaustion already took off `saveDC` — marks the badge when > 0. */
  saveDCPenalty: number
  saveLabel: string
  attackBonus: number | undefined
  onCast?: (cost: SpellCost) => void
}) {
  const t = useT()
  const fm = spell.frontmatter
  const [chosenTier, setTier] = useState(fm.level)
  const baseCost = spellCost(character, fm, maxTier)
  // Clamped, so fewer unlocked tiers after a reload can't leave the chosen tier out of range.
  const tier = baseCost?.kind === 'mana' ? Math.min(Math.max(chosenTier, baseCost.tiers.min), baseCost.tiers.max) : fm.level
  const cost = tier === fm.level ? baseCost : spellCost(character, fm, maxTier, tier)
  const damage = spellDamage(character, fm, tier)
  const flow = spellRollFlow(fm, damage)
  const area = isAreaSpell(fm)
  const targetKind: SpellTargetKind | undefined = fm.target_kind ?? (area ? 'aoe' : undefined)
  const utility = isUtilitySpell(fm)
  const tierSuffix = tier > fm.level ? ` (${t('spells.levelBadge', { level: tier })})` : ''

  const dcText = t('spells.saveBadge', { dc: saveDC ?? '—', ability: saveLabel })
  const dmHint = t(area ? 'spells.dmSaveHintArea' : 'spells.dmSaveHint', { ability: saveLabel, dc: saveDC ?? '—' })
  const damageNote = [
    t(flow === 'save' ? 'spells.damageNoteSave' : flow === 'auto' ? 'spells.damageNoteAuto' : 'roll.damageNote'),
    fm.ignores_armor ? t('spells.ignoresArmorHint') : undefined,
  ]
    .filter(Boolean)
    .join(' · ')

  const steps = [
    flow === 'attack' && attackBonus !== undefined && (
      <CaptionedRoll key="attack" caption={t('roll.attackCaption')}>
        <D20RollButton label={t('roll.attackSuffix', { name: fm.name })} modifier={attackBonus} note={t('spells.attackNote')} className={ROLL_BUTTON}>
          <HitIcon />
          <D20Modifier value={attackBonus} hint={false} />
        </D20RollButton>
      </CaptionedRoll>
    ),
    flow === 'save' && (
      <CaptionedRoll key="save" caption={t('spells.dmCaption')} className="text-violet-400/80">
        <span className="dm-roll" title={dmHint}>
          <DmIcon />
          {saveDCPenalty > 0 && saveDC !== undefined ? (
            <ExhaustedValue hint={t('exhaustion.dcHint', { base: saveDC + saveDCPenalty, n: saveDCPenalty, total: saveDC })}>{dcText}</ExhaustedValue>
          ) : (
            dcText
          )}
        </span>
      </CaptionedRoll>
    ),
    flow === 'auto' && (
      <CaptionedRoll key="auto" caption={t('spells.autoCaption')} className="text-accent/80">
        <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 px-1.5 py-0.5 text-xs text-accent" title={t('spells.autoHint')}>
          <AutoHitIcon />
          {t('spells.autoHit')}
        </span>
      </CaptionedRoll>
    ),
    damage && (
      <CaptionedRoll key="damage" caption={t('roll.damageCaption')}>
        <DamageRollButton
          label={`${t('roll.damageSuffix', { name: fm.name })}${tierSuffix}`}
          dice={damage}
          damageType={fm.damage_type}
          note={damageNote}
          className={`${ROLL_BUTTON} ${tier > fm.level ? 'is-upcast-roll' : ''}`}
        >
          <DieIcon formula={damage} />
          {damage}
        </DamageRollButton>
      </CaptionedRoll>
    ),
  ].filter(Boolean)

  const locked = cost?.kind === 'mana' && cost.locked

  return (
    <li className={`rounded-lg border border-border bg-surface-2 ${locked ? 'opacity-70' : ''}`}>
      <details>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1.5 p-2.5 text-sm marker:content-none">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
            {utility ? t('spells.utilityBadge') : fm.level === 0 ? t('spells.cantripBadge') : t('spells.levelBadge', { level: fm.level })}
          </span>
          <span className="font-semibold text-fg">{fm.name}</span>
          <span className="text-xs italic text-fg-muted">{fm.school}</span>
          {fm.actions !== undefined && <ActionPips actions={fm.actions} />}
          {targetKind && (
            <Chip title={t(targetKind === 'aoe' ? 'spells.areaHint' : TARGET_KEY[targetKind])}>
              {targetKind === 'aoe' && <AreaIcon />}
              {t(TARGET_KEY[targetKind])}
            </Chip>
          )}
          {fm.reaction && (
            <Chip title={t('spells.reactionHint')} className="border-warning/40 text-warning">
              {t('spells.reaction')}
            </Chip>
          )}
          {fm.concentration && <Chip title={t('spells.concentration')}>C</Chip>}
          {fm.ritual && <Chip title={t('spells.ritual')}>R</Chip>}
          {fm.ignores_armor && (
            <Chip title={t('spells.ignoresArmorHint')} className="border-orange-400/40 text-orange-400">
              {t('spells.ignoresArmor')}
            </Chip>
          )}
          {fm.damage_type && <span className="text-xs text-fg-muted">{fm.damage_type}</span>}
          {(cost || steps.length > 0) && (
            <span className="ml-auto flex items-start gap-1.5">
              {cost && <CastControl cost={cost} tier={tier} baseTier={fm.level} onTier={setTier} spellName={fm.name} onCast={onCast} />}
              {cost && steps.length > 0 && <span className="mx-0.5 mt-0.5 h-5 w-px bg-border" aria-hidden />}
              {steps.flatMap((step, i) => (i === 0 ? [step] : [<StepArrow key={`arrow-${i}`} />, step]))}
            </span>
          )}
        </summary>
        <div className="border-t border-border p-2.5 pt-2">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-fg-muted sm:grid-cols-4">
            <Detail label={t('spells.castingTime')}>{fm.actions !== undefined ? t('spells.actionsHint', { n: fm.actions }) : fm.casting_time}</Detail>
            <Detail label={t('spells.range')}>{fm.range}</Detail>
            {fm.components.length > 0 && <Detail label={t('spells.components')}>{fm.components.join(', ')}</Detail>}
            <Detail label={t('spells.duration')}>{fm.duration}</Detail>
            {fm.target && <Detail label={t('spells.target')}>{fm.target}</Detail>}
            {cost?.kind === 'mana' && (
              <Detail label={t('stats.mana')}>
                <span className="mana-caption">{fm.mana_cost ?? fm.level}</span>
              </Detail>
            )}
          </dl>
          {(fm.high_levels || fm.upcast) && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {fm.high_levels && (
                <span>
                  <span className="font-semibold uppercase tracking-wide text-trim">{t('spells.highLevels')}:</span> <span className="text-fg">{fm.high_levels}</span>
                </span>
              )}
              {fm.upcast && (
                <span>
                  <span className="mana-caption font-semibold uppercase tracking-wide">{t('spells.upcast')}:</span> <span className="text-fg">{fm.upcast}</span>
                </span>
              )}
            </div>
          )}
          {spell.body && <div className="mt-2 text-sm text-fg">{renderObsidianBody(spell.body)}</div>}
        </div>
      </details>
    </li>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="uppercase">{label}</dt>
      <dd className="text-fg">{children}</dd>
    </div>
  )
}
