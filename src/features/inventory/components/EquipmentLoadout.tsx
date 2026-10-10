import { useState, type ReactNode } from 'react'
import { SectionTitle } from '../../../components/SectionTitle'
import { useT } from '../../../i18n/useI18n'
import type { EndeavourItemFrontmatter } from '../../../vault/adapters/endeavourItem'
import { evasionValue, formatModifier, nimbleAttributeValue } from '../../../rules/deriveStats'
import type { CharacterFrontmatter, VaultFile } from '../../../vault/types'
import { wikilinkTarget } from '../../../vault/wikilinkSyntax'
import { resolveEndeavourItemLink, type VaultIndex } from '../../../vault/wikilinks'
import { encodeDragPayload } from '../dragPayload'
import { armorLookOf, equippedKey, equippedWeapons, MAX_RINGS, type EquippedRef } from '../equipment'
import { KIND_TILE_CLASSES } from '../itemColors'
import { ArmorIcon, BeltIcon, BootsIcon, CloakIcon, GlovesIcon, HeadIcon, NecklaceIcon, RingIcon, ShieldIcon, SwordIcon, UnequipIcon, WeaponIcon } from './equipmentIcons'
import { PaperDoll, type DollPart, type StatDelta } from './PaperDoll'

let deltaSeq = 0

/**
 * The character's worn and wielded gear, laid out like an RPG character screen: a silhouette in the
 * middle, five slots down each side — head, necklace, armor, belt and boots on its left (top to
 * bottom, roughly where they sit on the body), cloak, shield, gloves and the two rings on its right — and the weapons racked beside the stage (below it when the panel is narrow). The figure lights up where something is worn (and glows
 * where the hovered slot sits), and every change to armor class or evasion floats up as a "+2 RK"
 * chip. The whole panel is one drop target — an item dropped anywhere on it goes to the slot its kind
 * belongs in (`onDropPayload`; a ring dropped on a ring slot goes onto that finger); an equipped item
 * can be dragged back onto a container to stow it there.
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
  onDropPayload: (raw: string, ringPosition?: number) => void
}) {
  const t = useT()
  const [dragOver, setDragOver] = useState(false)
  const [hovered, setHovered] = useState<DollPart | undefined>()

  const armorClass = character.armor_class
  const evasion = evasionValue(character)
  const [shown, setShown] = useState({ armorClass, evasion })
  const [deltas, setDeltas] = useState<StatDelta[]>([])
  // Derived-state pattern (no effect): a changed stat since the last render queues its delta chip.
  if (shown.armorClass !== armorClass || shown.evasion !== evasion) {
    const next: StatDelta[] = []
    if (shown.armorClass !== armorClass) next.push({ id: ++deltaSeq, label: t('short.armorClass'), delta: armorClass - shown.armorClass })
    if (evasion !== undefined && shown.evasion !== undefined && shown.evasion !== evasion) {
      next.push({ id: ++deltaSeq, label: t('short.evasion'), delta: evasion - shown.evasion })
    }
    setShown({ armorClass, evasion })
    setDeltas((current) => [...current, ...next])
  }

  const resolve = (link: string | undefined) => (link ? resolveEndeavourItemLink(index, link) : undefined)
  const armor = resolve(character.armor)
  const shield = resolve(character.shield)
  const rings = character.rings ?? []
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
    dragPayload: encodeDragPayload({ type: 'equipped', ref }),
    canEdit,
  })

  /** A body slot beside the silhouette: the equipped item's tile, or an empty socket. */
  const bodySlot = (part: DollPart, ref: EquippedRef, link: string | undefined, label: string, icon: ReactNode, extra?: { badge?: ReactNode; warn?: string; tooltip?: string }) => {
    const ringPosition = ref.slot === 'ring' ? ref.position : undefined
    const hover = {
      onPointerEnter: () => setHovered(part),
      onPointerLeave: () => setHovered((h) => (h === part ? undefined : h)),
      onFocus: () => setHovered(part),
      onBlur: () => setHovered((h) => (h === part ? undefined : h)),
    }
    return (
      <BodySlot key={part} label={label} icon={icon} hover={hover} ringPosition={ringPosition} onDropPayload={onDropPayload} {...extra} {...(link ? slotProps(ref, link, resolve(link)) : {})} />
    )
  }

  const armorTooltip = [
    armorFm?.bw_cap !== undefined ? t('equipment.maxBw', { value: formatModifier(armorFm.bw_cap) }) : undefined,
    armorFm?.stealth_disadvantage ? t('equipment.stealth', { value: formatModifier(armorFm.stealth_disadvantage) }) : undefined,
  ]
    .filter(Boolean)
    .join(' · ')

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
      className={`equip-loadout @container rpg-panel p-3 transition-shadow ${dragOver ? 'equip-loadout-over' : ''}`}
    >
      <SectionTitle className="mb-2">{t('equipment.title')}</SectionTitle>

      {/* Wide enough (the panel, not the window: a container query), the weapons rack stands beside the
          stage, in the room the slot columns leave around the figure; otherwise it sits below. */}
      <div className="flex flex-col gap-3 @xl:flex-row">
        <div className="equip-stage grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-2 rounded-md p-2 sm:gap-3">
          <div className="flex flex-col justify-between gap-1.5">
            {bodySlot('head', { slot: 'head' }, character.head, t('equipment.head'), <HeadIcon />)}
            {bodySlot('necklace', { slot: 'necklace' }, character.necklace, t('equipment.necklace'), <NecklaceIcon />)}
            {bodySlot('armor', { slot: 'armor' }, character.armor, t('equipment.armor'), <ArmorIcon />, {
              badge: armorFm?.rk !== undefined ? t('equipment.rk', { value: armorFm.rk }) : undefined,
              warn: strengthShort !== undefined ? t('equipment.strengthMissingHint', { st: formatModifier(st), value: formatModifier(strengthShort) }) : undefined,
              tooltip: armorTooltip || undefined,
            })}
            {bodySlot('belt', { slot: 'belt' }, character.belt, t('equipment.belt'), <BeltIcon />)}
            {bodySlot('boots', { slot: 'boots' }, character.boots, t('equipment.boots'), <BootsIcon />)}
          </div>

          <PaperDoll
            parts={{
              head: Boolean(character.head),
              cloak: Boolean(character.cloak),
              armor: Boolean(character.armor),
              gloves: Boolean(character.gloves),
              belt: Boolean(character.belt),
              boots: Boolean(character.boots),
              necklace: Boolean(character.necklace),
              ring0: Boolean(rings[0]),
              ring1: Boolean(rings[1]),
              shield: Boolean(character.shield),
              weapon: weapons.length > 0,
            }}
            armorLook={character.armor ? armorLookOf(armor?.frontmatter) : undefined}
            weapons={weapons.map(({ item }) => {
              const fm = item?.frontmatter.kind === 'weapon' ? item.frontmatter : undefined
              return { form: fm?.form, twoHanded: fm?.hands === 'two' }
            })}
            hovered={hovered}
            armorClass={armorClass}
            evasion={evasion}
            deltas={deltas}
            onDeltaDone={(id) => setDeltas((d) => d.filter((x) => x.id !== id))}
          />

          <div className="flex flex-col justify-between gap-1.5">
            {bodySlot('cloak', { slot: 'cloak' }, character.cloak, t('equipment.cloak'), <CloakIcon />)}
            {bodySlot('shield', { slot: 'shield' }, character.shield, t('equipment.shield'), <ShieldIcon />, {
              badge: shieldRk !== undefined ? t('equipment.blockShort', { value: shieldRk }) : undefined,
              tooltip: shieldRk !== undefined ? t('equipment.blockHint', { value: shieldRk }) : undefined,
            })}
            {bodySlot('gloves', { slot: 'gloves' }, character.gloves, t('equipment.gloves'), <GlovesIcon />)}
            {Array.from({ length: MAX_RINGS }, (_, position) =>
              bodySlot(position === 0 ? 'ring0' : 'ring1', { slot: 'ring', position }, rings[position], t('equipment.ring', { n: position + 1 }), <RingIcon />),
            )}
          </div>
        </div>

        <div className="@xl:w-52 @xl:shrink-0">
          <div className="mb-1.5 flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-wider text-trim/80">
            <SwordIcon className="size-3" />
            {t('equipment.weapons')}
            <span className="h-px flex-1 bg-trim/20" />
          </div>
          <div className="grid grid-cols-1 gap-1.5 @sm:grid-cols-2 @xl:grid-cols-1">
            {weapons.map(({ position, link, item, charges }) => {
              const fm = item?.frontmatter.kind === 'weapon' ? item.frontmatter : undefined
              const name = item?.frontmatter.name ?? wikilinkTarget(link)
              const attack = character.attacks?.find((a) => a.name === name)
              return (
                <GearSlot
                  key={`${position}:${link}`}
                  {...slotProps({ slot: 'weapon', position }, link, item)}
                  label={fm?.category ?? t('equipment.weapons')}
                  icon={<WeaponIcon form={fm?.form} />}
                  hover={() => setHovered('weapon')}
                  unhover={() => setHovered((h) => (h === 'weapon' ? undefined : h))}
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

            {/* The whole panel takes drops, so this socket is only a hint: shown with no weapon, or where it
                fills the free half of a two-column weapon row — never as an extra row below. */}
            {canEdit && (weapons.length === 0 || weapons.length % 2 === 1) && (
              <div
                className={`equip-socket rpg-slot min-h-11 items-center justify-center gap-1.5 px-2 text-center text-[0.65rem] text-fg-muted ${
                  weapons.length === 0 ? 'flex' : 'hidden @sm:flex'
                }`}
              >
                <SwordIcon className="size-3.5 shrink-0 opacity-45" />
                {t('equipment.emptyWeapon')}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * A square slot beside the silhouette, like a game's character screen: the slot's name on a small
 * plate, its icon, and — once something is worn there — the item's name, kind tint and key stat
 * (`badge`). Empty, it's a sunken socket with a faded icon. `warn` rings it red (e.g. armor too heavy
 * for the wearer's Strength). A ring slot (`ringPosition`) is its own drop target, so a ring dropped
 * on it goes onto that finger.
 */
function BodySlot({
  label,
  icon,
  hover,
  ringPosition,
  onDropPayload,
  badge,
  warn,
  tooltip,
  link,
  item,
  selected = false,
  onSelect,
  onUnequip,
  dragPayload,
  canEdit = false,
}: {
  label: string
  icon: ReactNode
  hover: { onPointerEnter: () => void; onPointerLeave: () => void; onFocus: () => void; onBlur: () => void }
  ringPosition?: number
  onDropPayload: (raw: string, ringPosition?: number) => void
  badge?: ReactNode
  warn?: string
  tooltip?: string
  link?: string
  item?: VaultFile<EndeavourItemFrontmatter>
  selected?: boolean
  onSelect?: () => void
  onUnequip?: () => void
  dragPayload?: string
  canEdit?: boolean
}) {
  const t = useT()
  const [over, setOver] = useState(false)
  const worn = link !== undefined
  const name = worn ? (item?.frontmatter.name ?? wikilinkTarget(link)) : undefined
  const tint = worn ? (item ? KIND_TILE_CLASSES[item.frontmatter.kind] : 'border-border bg-surface-2') : ''
  const title = [name ?? label, tooltip, warn].filter(Boolean).join('\n')

  return (
    <div
      {...hover}
      key={link}
      role={worn ? 'button' : undefined}
      tabIndex={worn ? 0 : undefined}
      title={title}
      draggable={worn && canEdit}
      onDragStart={(e) => dragPayload && e.dataTransfer.setData('text/plain', dragPayload)}
      onDragOver={() => setOver(true)}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
      }}
      onDrop={(e) => {
        setOver(false)
        if (ringPosition === undefined) return // the panel's own drop handler takes it
        e.preventDefault()
        e.stopPropagation()
        const raw = e.dataTransfer.getData('text/plain')
        if (raw) onDropPayload(raw, ringPosition)
      }}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`equip-body-slot group relative flex size-[4rem] shrink-0 flex-col items-center overflow-hidden rounded-md border text-center transition sm:size-[4.25rem] ${
        worn
          ? `equip-flash text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_2px_6px_-2px_rgb(0_0_0/0.6)] hover:brightness-125 ${canEdit ? 'cursor-grab' : 'cursor-pointer'} ${tint}`
          : 'equip-socket rpg-slot'
      } ${selected ? 'ring-2 ring-trim' : ''} ${warn ? 'ring-2 ring-danger/80' : ''} ${over ? 'equip-body-slot-over' : ''}`}
    >
      {/* No letter-spacing: the longest captions ("Handschuhe", "Halskette") must fit the slot unclipped. */}
      <span className={`w-full truncate px-px pt-0.5 text-[0.5rem] font-bold uppercase leading-tight tracking-normal sm:text-[0.53rem] ${worn ? 'bg-black/25 text-trim' : 'text-trim/70'}`}>
        {label}
      </span>
      <span className={`mt-0.5 flex min-h-0 flex-1 items-center justify-center [&>svg]:size-full ${worn ? 'size-5 text-trim sm:size-6' : 'size-6 text-trim opacity-30 sm:size-7'}`}>
        {icon}
      </span>
      {name && (
        <span lang="de" className="line-clamp-2 w-full hyphens-auto px-0.5 pb-0.5 font-display text-[0.55rem] font-bold leading-[1.1] [overflow-wrap:anywhere] sm:text-[0.6rem]">
          {name}
        </span>
      )}
      {badge && <span className="rpg-plate absolute right-0.5 top-3 px-1 font-num text-[0.55rem] leading-tight text-trim">{badge}</span>}
      {warn && <span className="absolute left-0.5 top-3 flex size-3.5 items-center justify-center rounded-full bg-danger text-[0.6rem] font-bold text-surface">!</span>}
      {worn && canEdit && onUnequip && (
        <button
          type="button"
          aria-label={t('equipment.unequipAria', { name: name ?? '' })}
          title={t('equipment.unequip')}
          onClick={(e) => {
            e.stopPropagation()
            onUnequip()
          }}
          className={`absolute bottom-0.5 right-0.5 flex size-5 cursor-pointer items-center justify-center rounded-full border border-trim/35 bg-surface/90 text-fg-muted transition hover:border-trim hover:bg-trim hover:text-surface focus:opacity-100 group-hover:opacity-100 ${
            selected ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <UnequipIcon />
        </button>
      )}
    </div>
  )
}

/** One equipped weapon or shield as a slim two-line row: icon + slot label + name, then the stats it
 * contributes as small chips, and a "take off" button. Kind-tinted like its inventory tile; replays a
 * gilded flash whenever a new item lands in it (`key` on the link). */
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
  hover,
  unhover,
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
  hover: () => void
  unhover: () => void
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
      onPointerEnter={hover}
      onPointerLeave={unhover}
      onFocus={hover}
      onBlur={unhover}
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
        <span className="size-3.5 shrink-0 self-center text-trim [&>svg]:size-full" title={label}>
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
