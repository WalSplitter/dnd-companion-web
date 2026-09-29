import { useState, type ReactNode } from 'react'
import { SectionTitle } from '../../../components/SectionTitle'
import { useT } from '../../../i18n/useI18n'
import type { EndeavourItemFrontmatter } from '../../../vault/adapters/endeavourItem'
import { evasionValue, formatModifier, nimbleAttributeValue } from '../../../vault/deriveStats'
import type { CharacterFrontmatter, VaultFile } from '../../../vault/types'
import { wikilinkTarget } from '../../../vault/wikilinkSyntax'
import { resolveEndeavourItemLink, type VaultIndex } from '../../../vault/wikilinks'
import { equippedKey, equippedWeapons, type EquippedRef } from '../equipment'
import { KIND_TILE_CLASSES } from '../itemColors'

/** Native-DnD payload for dragging an equipped item off the loadout onto a container, which takes it
 * off and stows it there — see `EndeavourInventoryGrid.handleDrop`. */
export interface EquippedDragPayload {
  type: 'equipped'
  ref: EquippedRef
}

/** A stat the loadout just changed, floated up over the paper doll for a moment. */
interface StatDelta {
  id: number
  label: string
  delta: number
}

let deltaSeq = 0

/**
 * The character's worn and wielded gear, drawn as an adventurer's paper doll: armor on the left, the
 * shield on the right, the weapons racked below. The figure lights up where something is equipped, and
 * every change to armor class or evasion floats up as a "+2 RK" chip. The whole panel is one drop
 * target — an item dropped anywhere on it goes to the slot its kind belongs in (`onDropPayload`);
 * an equipped item can be dragged back onto a container to stow it there.
 */
export function EquipmentLoadout({
  character,
  index,
  canEdit,
  selectedKey,
  onSelect,
  onUnequip,
  onDropPayload,
}: {
  character: CharacterFrontmatter
  index: VaultIndex
  canEdit: boolean
  selectedKey: string | undefined
  onSelect: (ref: EquippedRef, item: VaultFile<EndeavourItemFrontmatter> | undefined, link: string) => void
  onUnequip: (ref: EquippedRef) => void
  onDropPayload: (raw: string) => void
}) {
  const t = useT()
  const [dragOver, setDragOver] = useState(false)

  const armorClass = character.armor_class
  const evasion = evasionValue(character)
  const [shown, setShown] = useState({ armorClass, evasion })
  const [deltas, setDeltas] = useState<StatDelta[]>([])
  // Derived-state pattern (no effect): a changed stat since the last render queues its delta chip.
  if (shown.armorClass !== armorClass || shown.evasion !== evasion) {
    const next: StatDelta[] = []
    if (shown.armorClass !== armorClass) next.push({ id: ++deltaSeq, label: t('short.armorClass'), delta: armorClass - shown.armorClass })
    if (evasion !== undefined && shown.evasion !== undefined && shown.evasion !== evasion) {
      next.push({ id: ++deltaSeq, label: t('stats.evasion'), delta: evasion - shown.evasion })
    }
    setShown({ armorClass, evasion })
    setDeltas((current) => [...current, ...next])
  }

  const armor = character.armor ? resolveEndeavourItemLink(index, character.armor) : undefined
  const shield = character.shield ? resolveEndeavourItemLink(index, character.shield) : undefined
  const weapons = equippedWeapons(character).map((w) => ({ ...w, item: resolveEndeavourItemLink(index, w.link) }))

  const armorFm = armor?.frontmatter.kind === 'armor' ? armor.frontmatter : undefined
  const st = nimbleAttributeValue(character, 'st')
  const strengthShort = armorFm?.strength_requirement !== undefined && st < armorFm.strength_requirement ? armorFm.strength_requirement : undefined
  const shieldRk = shield && (shield.frontmatter.kind === 'shield' || shield.frontmatter.kind === 'armor') ? shield.frontmatter.rk : undefined

  const slotProps = (ref: EquippedRef, link: string, item: VaultFile<EndeavourItemFrontmatter> | undefined) => ({
    link,
    item,
    selected: selectedKey === equippedKey(ref),
    onSelect: () => onSelect(ref, item, link),
    onUnequip: () => onUnequip(ref),
    dragPayload: JSON.stringify({ type: 'equipped', ref } satisfies EquippedDragPayload),
    canEdit,
  })

  return (
    <section
      aria-label={t('equipment.title')}
      title={canEdit ? `${t('equipment.dropHint')}. ${t('equipment.freeSlotsHint')}` : t('equipment.freeSlotsHint')}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const raw = e.dataTransfer.getData('text/plain')
        if (raw) onDropPayload(raw)
      }}
      className={`equip-loadout rpg-panel p-3 transition-shadow ${dragOver ? 'equip-loadout-over' : ''}`}
    >
      <SectionTitle className="mb-2">{t('equipment.title')}</SectionTitle>

      <div className="flex gap-2.5">
        <PaperDoll armor={Boolean(character.armor)} shield={Boolean(character.shield)} weapon={weapons.length > 0} deltas={deltas} onDeltaDone={(id) => setDeltas((d) => d.filter((x) => x.id !== id))} />

        <div className="grid min-w-0 flex-1 grid-cols-1 content-start gap-1.5 sm:grid-cols-2">
          {character.armor ? (
            <GearSlot
              {...slotProps({ slot: 'armor' }, character.armor, armor)}
              label={t('equipment.armor')}
              icon={<ArmorIcon />}
              chips={
                <>
                  {armorFm?.rk !== undefined && <Chip strong>{t('equipment.rk', { value: armorFm.rk })}</Chip>}
                  {armorFm?.bw_cap !== undefined && <Chip>{t('equipment.maxBw', { value: formatModifier(armorFm.bw_cap) })}</Chip>}
                  {armorFm?.stealth_disadvantage ? <Chip>{t('equipment.stealth', { value: formatModifier(armorFm.stealth_disadvantage) })}</Chip> : null}
                  {strengthShort !== undefined && (
                    <Chip danger title={t('equipment.strengthMissingHint', { st: formatModifier(st), value: formatModifier(strengthShort) })}>
                      {t('equipment.strengthMissing', { value: formatModifier(strengthShort) })}
                    </Chip>
                  )}
                </>
              }
            />
          ) : (
            <EmptySlot label={t('equipment.armor')} empty={t('equipment.emptyArmor')} icon={<ArmorIcon />} />
          )}

          {character.shield ? (
            <GearSlot
              {...slotProps({ slot: 'shield' }, character.shield, shield)}
              label={t('equipment.shield')}
              icon={<ShieldIcon />}
              chips={shieldRk !== undefined && <Chip strong title={t('equipment.blockHint', { value: shieldRk })}>{t('equipment.block', { value: shieldRk })}</Chip>}
            />
          ) : (
            <EmptySlot label={t('equipment.shield')} empty={t('equipment.emptyShield')} icon={<ShieldIcon />} />
          )}

          {weapons.map(({ position, link, item, charges }) => {
            const fm = item?.frontmatter.kind === 'weapon' ? item.frontmatter : undefined
            const name = item?.frontmatter.name ?? wikilinkTarget(link)
            const attack = character.attacks?.find((a) => a.name === name)
            return (
              <GearSlot
                key={`${position}:${link}`}
                {...slotProps({ slot: 'weapon', position }, link, item)}
                label={fm?.category ?? t('equipment.weapons')}
                icon={<SwordIcon />}
                chips={
                  <>
                    {charges !== undefined && (
                      <Chip danger={charges === 0} title={t('endeavourInventory.detailCharges')}>
                        ×{charges}
                        {fm?.stack_size ? `/${fm.stack_size}` : ''}
                      </Chip>
                    )}
                    {attack && (
                      <Chip strong>
                        {formatModifier(attack.attack_bonus)} · {attack.damage_dice}
                        {attack.damage_bonus ? formatModifier(attack.damage_bonus) : ''}
                      </Chip>
                    )}
                    {attack?.damage_type && <Chip>{attack.damage_type.replace(/schaden/gi, '')}</Chip>}
                    {fm?.hands && (
                      <Chip title={t(fm.hands === 'two' ? 'equipment.handsTwoHint' : 'equipment.handsOneHint')}>
                        {t(fm.hands === 'two' ? 'equipment.handsTwo' : 'equipment.handsOne')}
                      </Chip>
                    )}
                  </>
                }
              />
            )
          })}

          {canEdit && (
            <div className="equip-socket rpg-slot flex min-h-11 items-center justify-center gap-1.5 px-2 text-center text-[0.65rem] text-fg-muted">
              <SwordIcon className="size-3.5 shrink-0 opacity-45" />
              {t('equipment.emptyWeapon')}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/** One equipped item as a slim two-line row: icon + slot label + name, then the stats it contributes
 * as small chips, and a "take off" button. Kind-tinted like its inventory tile; replays a gilded
 * flash whenever a new item lands in it (`key` on the link). */
function GearSlot({
  label,
  icon,
  link,
  item,
  chips,
  selected,
  onSelect,
  onUnequip,
  dragPayload,
  canEdit,
}: {
  label: string
  icon: ReactNode
  link: string
  item: VaultFile<EndeavourItemFrontmatter> | undefined
  chips?: ReactNode
  selected: boolean
  onSelect: () => void
  onUnequip: () => void
  dragPayload: string
  canEdit: boolean
}) {
  const t = useT()
  const name = item?.frontmatter.name ?? wikilinkTarget(link)
  const tint = item ? KIND_TILE_CLASSES[item.frontmatter.kind] : 'border-border bg-surface-2'

  return (
    <div
      key={link}
      role="button"
      tabIndex={0}
      draggable={canEdit}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', dragPayload)}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`equip-slot equip-flash relative flex min-h-11 min-w-0 flex-col justify-center rounded-md border py-1 pl-2 text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_2px_6px_-2px_rgb(0_0_0/0.6)] transition hover:brightness-125 ${
        canEdit ? 'cursor-grab pr-7' : 'cursor-pointer pr-2'
      } ${tint} ${selected ? 'ring-2 ring-trim' : ''}`}
    >
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="size-3 shrink-0 self-center text-trim [&>svg]:size-full" title={label}>
          {icon}
        </span>
        <span className="min-w-0 truncate font-display text-[0.78rem] font-bold leading-tight tracking-wide">{name}</span>
        <span className="hidden shrink-0 truncate text-[0.55rem] font-bold uppercase tracking-wider text-trim/80 min-[28rem]:inline">{label}</span>
      </div>
      {chips && <div className="mt-0.5 flex flex-wrap gap-1">{chips}</div>}
      {canEdit && (
        <button
          type="button"
          aria-label={t('equipment.unequipAria', { name })}
          title={t('equipment.unequip')}
          onClick={(e) => {
            e.stopPropagation()
            onUnequip()
          }}
          className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-trim/35 bg-surface/85 text-fg-muted transition hover:border-trim hover:bg-trim hover:text-surface"
        >
          <UnequipIcon />
        </button>
      )}
    </div>
  )
}

function EmptySlot({ label, empty, icon }: { label: string; empty: string; icon: ReactNode }) {
  return (
    <div className="equip-socket rpg-slot flex min-h-11 min-w-0 items-center gap-2 px-2">
      <span className="size-4 shrink-0 text-trim opacity-40 [&>svg]:size-full">{icon}</span>
      <span className="min-w-0 truncate text-[0.65rem]">
        <span className="font-bold uppercase tracking-wider text-trim/80">{label}</span>
        <span className="italic text-fg-muted"> · {empty}</span>
      </span>
    </div>
  )
}

function Chip({ children, strong = false, danger = false, title }: { children: ReactNode; strong?: boolean; danger?: boolean; title?: string }) {
  return (
    <span
      title={title}
      className={`rounded-sm px-1 py-px text-[0.6rem] font-semibold leading-tight ${
        danger ? 'bg-danger/20 text-danger' : strong ? 'bg-trim/20 text-trim' : 'bg-black/25 text-fg-muted'
      }`}
    >
      {children}
    </span>
  )
}

/** A gilded adventurer silhouette: the torso takes on a breastplate when armor is worn, a heater
 * shield appears in one hand and a blade in the other. Stat deltas float up from its chest. */
function PaperDoll({
  armor,
  shield,
  weapon,
  deltas,
  onDeltaDone,
}: {
  armor: boolean
  shield: boolean
  weapon: boolean
  deltas: StatDelta[]
  onDeltaDone: (id: number) => void
}) {
  return (
    <div className="relative flex w-14 shrink-0 items-center justify-center sm:w-20" aria-hidden>
      <svg viewBox="0 0 100 150" className="equip-doll h-full max-h-36 w-full">
        <ellipse cx="50" cy="143" rx="30" ry="4" className="equip-doll-shadow" />
        <g className="equip-doll-body">
          <circle cx="50" cy="20" r="11" />
          <path d="M33 37 Q50 30 67 37 L71 84 Q50 91 29 84 Z" />
          <path d="M33 39 L21 76" />
          <path d="M67 39 L79 76" />
          <path d="M41 88 L38 136" />
          <path d="M59 88 L62 136" />
        </g>
        <g className={`equip-doll-part ${armor ? 'is-on' : ''}`}>
          <path d="M31 38 Q50 31 69 38 L72 70 Q50 78 28 70 Z" className="equip-doll-fill" />
          <path d="M50 36 V74 M33 52 Q50 58 67 52" className="equip-doll-line" />
          <path d="M26 36 Q33 31 40 34 L36 44 Z M74 36 Q67 31 60 34 L64 44 Z" className="equip-doll-fill" />
        </g>
        <g className={`equip-doll-part ${shield ? 'is-on' : ''}`}>
          <path d="M79 62 L94 67 V80 C94 90 87 96 79 99 C71 96 64 90 64 80 V67 Z" className="equip-doll-fill" />
          <path d="M79 69 V92 M69 79 H89" className="equip-doll-line" />
        </g>
        <g className={`equip-doll-part ${weapon ? 'is-on' : ''}`}>
          <path d="M21 77 L9 30" className="equip-doll-blade" />
          <path d="M14 72 L28 68" className="equip-doll-line" />
          <path d="M21 77 L23 86" className="equip-doll-line" />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-x-[-1rem] top-1/3 z-10 flex flex-col items-center gap-1">
        {deltas.map((d) => (
          <span
            key={d.id}
            onAnimationEnd={() => onDeltaDone(d.id)}
            className={`equip-delta rpg-plate whitespace-nowrap px-1.5 py-px font-num text-xs ${d.delta > 0 ? 'text-success' : 'text-danger'}`}
          >
            {formatModifier(d.delta)} {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ArmorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M8 3 4 5.5l1 5.5h2.2V20c3.2 1.4 6.4 1.4 9.6 0v-9h2.2l1-5.5L16 3c-1.2 1.6-2.5 2.3-4 2.3S9.2 4.6 8 3Z" />
      <path d="M12 5.5V19M8.5 11.5c2.3 1 4.7 1 7 0" strokeLinecap="round" />
    </svg>
  )
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3 19 5.8V11c0 4.6-3 8-7 10-4-2-7-5.4-7-10V5.8Z" />
      <path d="M12 6.5V18M7.5 11h9" strokeLinecap="round" />
    </svg>
  )
}

export function SwordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 4h-4.5L7 12.5 11.5 17 20 8.5Z" />
      <path d="m5.5 11 7.5 7.5M8 16l-4 4" />
    </svg>
  )
}

function UnequipIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
      <path d="M8 2.5v7M5 6.5l3 3 3-3M3 11.5v2h10v-2" />
    </svg>
  )
}
