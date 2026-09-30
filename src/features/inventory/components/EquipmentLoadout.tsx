import { useId, useState, type ReactNode } from 'react'
import { SectionTitle } from '../../../components/SectionTitle'
import { useT } from '../../../i18n/useI18n'
import type { EndeavourItemFrontmatter } from '../../../vault/adapters/endeavourItem'
import { evasionValue, formatModifier, nimbleAttributeValue } from '../../../vault/deriveStats'
import type { CharacterFrontmatter, VaultFile } from '../../../vault/types'
import { wikilinkTarget } from '../../../vault/wikilinkSyntax'
import { resolveEndeavourItemLink, type VaultIndex } from '../../../vault/wikilinks'
import { equippedKey, equippedWeapons, MAX_RINGS, type EquippedRef } from '../equipment'
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

/** A part of the paper doll that lights up — one per slot (`ring0`/`ring1` per finger). */
type DollPart = 'cloak' | 'armor' | 'gloves' | 'boots' | 'necklace' | 'ring0' | 'ring1' | 'shield' | 'weapon'

let deltaSeq = 0

/**
 * The character's worn and wielded gear, laid out like an RPG character screen: a silhouette in the
 * middle, cloak, armor, gloves and boots in the slots on its left, the shield, necklace and two rings
 * on its right, and the weapons racked below. The figure lights up where something is worn (and glows
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
    dragPayload: JSON.stringify({ type: 'equipped', ref } satisfies EquippedDragPayload),
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
      className={`equip-loadout rpg-panel p-3 transition-shadow ${dragOver ? 'equip-loadout-over' : ''}`}
    >
      <SectionTitle className="mb-2">{t('equipment.title')}</SectionTitle>

      <div className="equip-stage grid grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-2 rounded-md p-2 sm:gap-3">
        <div className="flex flex-col justify-between gap-2">
          {bodySlot('cloak', { slot: 'cloak' }, character.cloak, t('equipment.cloak'), <CloakIcon />)}
          {bodySlot('armor', { slot: 'armor' }, character.armor, t('equipment.armor'), <ArmorIcon />, {
            badge: armorFm?.rk !== undefined ? t('equipment.rk', { value: armorFm.rk }) : undefined,
            warn: strengthShort !== undefined ? t('equipment.strengthMissingHint', { st: formatModifier(st), value: formatModifier(strengthShort) }) : undefined,
            tooltip: armorTooltip || undefined,
          })}
          {bodySlot('gloves', { slot: 'gloves' }, character.gloves, t('equipment.gloves'), <GlovesIcon />)}
          {bodySlot('boots', { slot: 'boots' }, character.boots, t('equipment.boots'), <BootsIcon />)}
        </div>

        <PaperDoll
          parts={{
            cloak: Boolean(character.cloak),
            armor: Boolean(character.armor),
            gloves: Boolean(character.gloves),
            boots: Boolean(character.boots),
            necklace: Boolean(character.necklace),
            ring0: Boolean(rings[0]),
            ring1: Boolean(rings[1]),
            shield: Boolean(character.shield),
            weapon: weapons.length > 0,
          }}
          hovered={hovered}
          armorClass={armorClass}
          evasion={evasion}
          deltas={deltas}
          onDeltaDone={(id) => setDeltas((d) => d.filter((x) => x.id !== id))}
        />

        <div className="flex flex-col justify-between gap-2">
          {bodySlot('shield', { slot: 'shield' }, character.shield, t('equipment.shield'), <ShieldIcon />, {
            badge: shieldRk !== undefined ? t('equipment.blockShort', { value: shieldRk }) : undefined,
            tooltip: shieldRk !== undefined ? t('equipment.blockHint', { value: shieldRk }) : undefined,
          })}
          {bodySlot('necklace', { slot: 'necklace' }, character.necklace, t('equipment.necklace'), <NecklaceIcon />)}
          {Array.from({ length: MAX_RINGS }, (_, position) =>
            bodySlot(position === 0 ? 'ring0' : 'ring1', { slot: 'ring', position }, rings[position], t('equipment.ring', { n: position + 1 }), <RingIcon />),
          )}
        </div>
      </div>

      <div className="mt-3 mb-1.5 flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-wider text-trim/80">
        <SwordIcon className="size-3" />
        {t('equipment.weapons')}
        <span className="h-px flex-1 bg-trim/20" />
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
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

        {canEdit && (
          <div className="equip-socket rpg-slot flex min-h-11 items-center justify-center gap-1.5 px-2 text-center text-[0.65rem] text-fg-muted">
            <SwordIcon className="size-3.5 shrink-0 opacity-45" />
            {t('equipment.emptyWeapon')}
          </div>
        )}
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
      className={`equip-body-slot group relative flex size-[4.25rem] shrink-0 flex-col items-center overflow-hidden rounded-md border text-center transition sm:size-20 lg:size-24 ${
        worn
          ? `equip-flash text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_2px_6px_-2px_rgb(0_0_0/0.6)] hover:brightness-125 ${canEdit ? 'cursor-grab' : 'cursor-pointer'} ${tint}`
          : 'equip-socket rpg-slot'
      } ${selected ? 'ring-2 ring-trim' : ''} ${warn ? 'ring-2 ring-danger/80' : ''} ${over ? 'equip-body-slot-over' : ''}`}
    >
      <span className={`w-full truncate px-0.5 pt-0.5 text-[0.5rem] font-bold uppercase leading-tight tracking-normal sm:tracking-wider sm:text-[0.55rem] ${worn ? 'bg-black/25 text-trim' : 'text-trim/70'}`}>
        {label}
      </span>
      <span className={`mt-0.5 flex min-h-0 flex-1 items-center justify-center [&>svg]:size-full ${worn ? 'size-6 text-trim sm:size-7 lg:size-9' : 'size-7 text-trim opacity-30 sm:size-8 lg:size-10'}`}>
        {icon}
      </span>
      {name && (
        <span lang="de" className="line-clamp-2 w-full hyphens-auto px-0.5 pb-0.5 font-display text-[0.55rem] font-bold leading-[1.1] [overflow-wrap:anywhere] sm:text-[0.62rem] lg:text-[0.68rem]">
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

/**
 * A shadowed full-body silhouette standing in a pool of light. Each worn piece is drawn over it in
 * gilt — a cloak falling behind it, a full plate harness, gauntlets, boots, a pendant, a glint on each ring finger, a shield on
 * one arm and a blade in the other hand — and the part the hovered slot belongs to glows faintly even
 * while empty. Armor class and evasion sit on a plate at its feet; stat deltas float up from its chest.
 */
function PaperDoll({
  parts,
  hovered,
  armorClass,
  evasion,
  deltas,
  onDeltaDone,
}: {
  parts: Record<DollPart, boolean>
  hovered: DollPart | undefined
  armorClass: number
  evasion: number | undefined
  deltas: StatDelta[]
  onDeltaDone: (id: number) => void
}) {
  const t = useT()
  const id = useId()
  const part = (name: DollPart) => `equip-doll-part ${parts[name] ? 'is-on' : ''} ${hovered === name ? 'is-hover' : ''}`

  return (
    <div className="relative flex min-w-0 flex-col items-center justify-between gap-1" aria-hidden>
      <svg viewBox="-26 0 172 220" className="equip-doll min-h-0 w-full max-w-56 flex-1">
        <defs>
          <radialGradient id={`${id}-light`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" className="equip-doll-light-core" />
            <stop offset="100%" className="equip-doll-light-edge" />
          </radialGradient>
          <linearGradient id={`${id}-body`} gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="215">
            <stop offset="0%" className="equip-doll-body-top" />
            <stop offset="100%" className="equip-doll-body-bottom" />
          </linearGradient>
          {/* Polished metal: each plate catches the light on its upper edge and darkens below. */}
          <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" className="equip-doll-plate-hi" />
            <stop offset="45%" className="equip-doll-plate-mid" />
            <stop offset="100%" className="equip-doll-plate-lo" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="110" rx="58" ry="104" fill={`url(#${id}-light)`} />
        <ellipse cx="60" cy="212" rx="36" ry="5" className="equip-doll-shadow" />

        {/* The cloak hangs behind the figure, so it is drawn first; its collar sits in front (below). */}
        <g className={part('cloak')}>
          <path d="M30 47 Q60 38 90 47 Q97 100 104 170 Q90 178 78 172 Q60 180 42 172 Q30 178 16 170 Q23 100 30 47 Z" className="equip-doll-fill equip-doll-cloak" />
          <path d="M26 92 Q22 130 20 166 M94 92 Q98 130 100 166 M60 120 V174" className="equip-doll-line equip-doll-fold" />
        </g>

        {/* The figure: a sturdy, heroic build — broad shoulders sloping from a strong neck, a
            V-shaped torso, powerful arms and legs — kept as a clean silhouette without inner
            lines, so the gear drawn over it carries the detail. */}
        <g fill={`url(#${id}-body)`} stroke="none" className="equip-doll-figure">
          <path d="M60 7 C52 7 48.5 13 48.5 20.5 C48.5 27 50 31.5 53 34.5 C55.5 37 58 38 60 38 C62 38 64.5 37 67 34.5 C70 31.5 71.5 27 71.5 20.5 C71.5 13 68 7 60 7 Z" />
          <path d="M54 31 C54 37 53.5 40 51 42 C46 44 38 45 33 49 C29 51 28 58 31 64 C34 70 37 76 39 84 C41 92 42 98 42 102 C41 108 38 114 38 124 C38 138 41 150 43 160 C40 168 40 178 42 188 C43 194 44 199 44 204 L55 204 C55 196 56 188 56 180 C57 172 56 166 56 160 C56 146 57 134 58 126 Q60 120 62 126 C63 134 64 146 64 160 C64 166 63 172 64 180 C64 188 65 196 65 204 L76 204 C76 199 77 194 78 188 C80 178 80 168 77 160 C79 150 82 138 82 124 C82 114 79 108 78 102 C78 98 79 92 81 84 C83 76 86 70 89 64 C92 58 91 51 87 49 C82 45 74 44 69 42 C66.5 40 66 37 66 31 Z" />
          <path d="M34 48 C28 49.5 25 55 25.5 62 C26 70 25.5 80 25.5 88 C25 96 22 106 19.5 116 L28.5 117.5 C30 108 33.5 98 35 90 C37 82 38.5 74 38 66 Z" />
          <path d="M86 48 C92 49.5 95 55 94.5 62 C94 70 94.5 80 94.5 88 C95 96 98 106 100.5 116 L91.5 117.5 C90 108 86.5 98 85 90 C83 82 81.5 74 82 66 Z" />
          <ellipse cx="24" cy="123.5" rx="5.8" ry="7.8" transform="rotate(12 24 123.5)" />
          <ellipse cx="96" cy="123.5" rx="5.8" ry="7.8" transform="rotate(-12 96 123.5)" />
          <ellipse cx="48" cy="207" rx="8.5" ry="4" />
          <ellipse cx="72" cy="207" rx="8.5" ry="4" />
        </g>

        <g className={part('cloak')}>
          <path d="M33 46 Q46 54 60 52 Q74 54 87 46 Q74 41 60 42 Q46 41 33 46 Z" className="equip-doll-fill" />
          <circle cx="60" cy="51" r="2.6" className="equip-doll-gem" />
        </g>

        {/* Armor is a full harness: everything the other slots don't cover — breastplate and
            gorget, pauldrons, arm plates down to the wrists, belt and tassets over the hips, thigh
            plates, knee cops and greaves down to where the boots begin. */}
        <g className={part('armor')}>
          <g fill={`url(#${id}-plate)`} className="equip-doll-plate">
            {/* legs: greaves, cuisses, tassets */}
            <path d="M41 165.5 L56.2 165.5 L56.3 177 L40.3 177 Z M79 165.5 L63.8 165.5 L63.7 177 L79.7 177 Z" />
            <path d="M38.8 131 L57.4 132 L56 154 L42 154 Z M81.2 131 L62.6 132 L64 154 L78 154 Z" />
            <ellipse cx="49.5" cy="160" rx="7.6" ry="5.6" />
            <ellipse cx="70.5" cy="160" rx="7.6" ry="5.6" />
            <path d="M39.5 108 Q48 112.5 57.5 113.5 L57 130 Q47 130 37.5 126 Z M80.5 108 Q72 112.5 62.5 113.5 L63 130 Q73 130 82.5 126 Z" />
            <path d="M56 112 Q60 113 64 112 L62.5 124 Q60 126 57.5 124 Z" />
            {/* arms: vambraces, elbow cops, rerebraces */}
            <path d="M24.7 94 L34.2 94 L29.5 111 L20.8 111 Z M95.3 94 L85.8 94 L90.5 111 L99.2 111 Z" />
            <path d="M25.5 70 L38 71 L35.8 86 L25.3 86 Z M94.5 70 L82 71 L84.2 86 L94.7 86 Z" />
            <circle cx="30.5" cy="89.5" r="4.8" />
            <circle cx="89.5" cy="89.5" r="4.8" />
            {/* torso: breastplate, then the belt over it */}
            <path d="M47 43 Q60 50 73 43 L86 50 C88 58 87 64 84 70 C81 80 80 90 79 101 Q60 107 41 101 C40 90 39 80 36 70 C33 64 32 58 34 50 Z" />
            <path d="M40 100 Q60 107 80 100 L80.5 106.5 Q60 113.5 39.5 106.5 Z" />
            {/* pauldrons: a domed plate with a lame beneath */}
            <path d="M24 69 C25 62 30 58 37 58 L38.5 63 C32.5 63 29 67 28 73 Z M96 69 C95 62 90 58 83 58 L81.5 63 C87.5 63 91 67 92 73 Z" />
            <path d="M22 62 C21 51 29 44 39 45 L45 50 C37 50 29 55 26.5 66 Z M98 62 C99 51 91 44 81 45 L75 50 C83 50 91 55 93.5 66 Z" />
          </g>
          <path
            d="M60 49 V104 M38 70 Q49 77 60 71 Q71 77 82 70 M39 118 Q48 121.5 57.3 122 M81 118 Q72 121.5 62.7 122 M40 143 H56.8 M80 143 H63.2 M25.4 78 H37 M94.6 78 H83"
            className="equip-doll-line equip-doll-etch"
          />
          <rect x="56.5" y="104.5" width="7" height="6" rx="1" className="equip-doll-buckle" />
          <path d="M60 74 L63.5 80 L60 86 L56.5 80 Z" className="equip-doll-emblem" />
          <g className="equip-doll-rivet">
            <circle cx="29" cy="52" r="0.9" />
            <circle cx="91" cy="52" r="0.9" />
            <circle cx="42" cy="111" r="0.8" />
            <circle cx="78" cy="111" r="0.8" />
            <circle cx="49.5" cy="160" r="1.1" />
            <circle cx="70.5" cy="160" r="1.1" />
            <circle cx="30.5" cy="89.5" r="1.1" />
            <circle cx="89.5" cy="89.5" r="1.1" />
          </g>
        </g>
        <g className={part('necklace')}>
          <path d="M52.5 41 Q54 52 60 56 Q66 52 67.5 41" className="equip-doll-line equip-doll-chain" />
          <path d="M60 55 L56 60 L60 66 L64 60 Z" className="equip-doll-fill" />
        </g>
        <g className={part('gloves')}>
          <path d="M16.5 110 H31.5 L30.5 117 V127 Q30.5 133.5 24 133.5 Q17.5 133.5 17.5 127 V117 Z M103.5 110 H88.5 L89.5 117 V127 Q89.5 133.5 96 133.5 Q102.5 133.5 102.5 127 V117 Z" className="equip-doll-fill" />
          <path d="M18 117 H30.5 M18 122 H30 M102 117 H89.5 M102 122 H90" className="equip-doll-line" />
        </g>
        <g className={part('boots')}>
          <path d="M39.5 175 H57 L56.5 201 Q60 204 58 210.5 H38 Q36 204 40 201 Z M80.5 175 H63 L63.5 201 Q60 204 62 210.5 H82 Q84 204 80 201 Z" className="equip-doll-fill" />
          <path d="M39.5 181 H57 M80.5 181 H63" className="equip-doll-line" />
        </g>
        {/* Sword and shield are held at the sides, clear of the body, roughly to scale with the ~1.8 m
            figure (220 units): a ~75 cm blade lowered and pointing out and down, and a ~70 cm heater
            shield hanging off the outside of the other hand, from the wrist to below the knee. */}
        <g className={part('shield')}>
          <path d="M94 97 Q119 88 144 97 V124 C144 148 132 162 119 171 C106 162 94 148 94 124 Z" className="equip-doll-fill" />
          <path d="M119 93 V167 M95 119 H143" className="equip-doll-line" />
          <circle cx="119" cy="119" r="5.5" className="equip-doll-fill" />
        </g>
        <g className={part('weapon')}>
          <path d="M22.5 128 L-18 205" className="equip-doll-blade" />
          <path d="M16.3 124.7 L28.7 131.3" className="equip-doll-line" />
          <path d="M22.5 128 L29 115.6" className="equip-doll-line" />
        </g>
        {/* Rings last, so the glint shows over a sword grip or a shield's rim. */}
        <g className={part('ring0')}>
          <circle cx="96" cy="128" r="3.6" className="equip-doll-ring" />
          <circle cx="96" cy="124.1" r="1.9" className="equip-doll-gem" />
        </g>
        <g className={part('ring1')}>
          <circle cx="24" cy="128" r="3.6" className="equip-doll-ring" />
          <circle cx="24" cy="124.1" r="1.9" className="equip-doll-gem" />
        </g>
      </svg>

      <div className="rpg-plate flex items-center gap-2 px-2 py-0.5 font-num text-[0.7rem] leading-tight">
        <span title={t('stats.armorClass')}>
          <span className="text-trim/80">{t('short.armorClass')}</span> <span className="font-semibold text-fg">{armorClass}</span>
        </span>
        {evasion !== undefined && (
          <span title={t('stats.evasion')}>
            <span className="text-trim/80">{t('short.evasion')}</span> <span className="font-semibold text-fg">{evasion}</span>
          </span>
        )}
      </div>

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

function CloakIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 3.5c1.2 1 2.5 1.5 4 1.5s2.8-.5 4-1.5c1 5.5 2.5 11 4.5 16.5-2 1-4 1-6 .3-1.6.8-3.4.8-5 0-2 .7-4 .7-6-.3C5.5 14.5 7 9 8 3.5Z" />
      <path d="M12 5v15M9.5 9 8 19M14.5 9l1.5 10" />
      <circle cx="12" cy="6.5" r="1" />
    </svg>
  )
}

function GlovesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 21v-5.5l-2.6-3.6a1.5 1.5 0 0 1 2.4-1.8L8.5 12V5a1.25 1.25 0 0 1 2.5 0V4a1.25 1.25 0 0 1 2.5 0v1a1.25 1.25 0 0 1 2.5 0v2a1.25 1.25 0 0 1 2.5 0v8c0 3.3-2.3 6-5.5 6Z" />
      <path d="M11 5v6M13.5 5v6M16 7v4.5M7 18.5h11" />
    </svg>
  )
}

function BootsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 3h6v10.5l5.2 2.7a3 3 0 0 1 1.8 2.7V21H5a1 1 0 0 1-1-1v-4.5L8 13Z" />
      <path d="M8 7h6M8 10h6M4 18h17" />
    </svg>
  )
}

function NecklaceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 3c0 6 3.5 10 7 11 3.5-1 7-5 7-11" strokeDasharray="0.1 2.4" strokeWidth="2" />
      <path d="M12 14l-2.5 3 2.5 4 2.5-4Z" />
    </svg>
  )
}

function RingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="15" r="5.5" />
      <path d="M9.5 7.5 12 4l2.5 3.5L12 9.5Z" />
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
