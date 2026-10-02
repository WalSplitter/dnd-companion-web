import { useMemo, useState } from 'react'
import { SectionTitle } from '../../../components/SectionTitle'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import { useCanEdit, useVaultStore } from '../../../store/vaultStore'
import { resolveItemSize, resolveSlotCost, type EndeavourItemSize } from '../../../vault/adapters/endeavourItem'
import { deriveEquipment, equipmentChangeFields } from '../../../vault/adapters/nativeCharacter'
import { evasionValue, formatModifier } from '../../../vault/deriveStats'
import type { CharacterFrontmatter, EndeavourContainerSlotAssignment, EndeavourInventoryEntry, EquipmentChange, WeaponAttack } from '../../../vault/types'
import { wikilinkTarget } from '../../../vault/wikilinkSyntax'
import { resolveEndeavourItemLink, type VaultIndex } from '../../../vault/wikilinks'
import { equipFromInventory, equipNew, equippedKey, equippedLink, equipSlotOf, isEquippedStack, isWornSlot, setEquippedCharges, unequip, type EquippedRef, type EquipResult } from '../equipment'
import { isCustomEntry, isStackEntry, resolveContainers, resolveEntry, tryPlaceEntry, type PlaceFailure, type ResolvedContainer } from '../grid'
import type { MoveTilePayload } from './ItemTile'
import { CapacityBar } from './CapacityBar'
import { ContainerGrid } from './ContainerGrid'
import { CurrencyDisplay } from './CurrencyDisplay'
import { EquipmentLoadout, type EquippedDragPayload } from './EquipmentLoadout'
import { ItemDetailPanel, type EquipAction, type EquipPreviewLine, type SelectedGridItem } from './ItemDetailPanel'
import { ItemSearchPanel, type ContainerOption } from './ItemSearchPanel'

/** The most slots an item of each size category takes (rule `Gegenstandsgrößen`: Klein 1, Mittel 2,
 * Groß 3; Sehr groß is 4 and up, so it caps nothing). */
const MAX_SLOTS_FOR_SIZE: Record<EndeavourItemSize, number | undefined> = { klein: 1, mittel: 2, gross: 3, sehr_gross: undefined }

/** A search result drop carries just the wikilink; a tile dragged from another container carries a
 * `MoveTilePayload` instead — see `ItemTile.tsx` — and an item dragged off the loadout an
 * `EquippedDragPayload`. */
type DropPayload = { type: 'new'; link: string } | MoveTilePayload | EquippedDragPayload

function parseEquippedRef(raw: unknown): EquippedRef | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const ref = raw as Record<string, unknown>
  if (isWornSlot(ref.slot)) return { slot: ref.slot }
  return (ref.slot === 'weapon' || ref.slot === 'ring') && typeof ref.position === 'number' ? { slot: ref.slot, position: ref.position } : undefined
}

function parseDropPayload(raw: string): DropPayload {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object') {
      const p = parsed as Record<string, unknown>
      if (p.type === 'move' && typeof p.sourceContainerIndex === 'number' && typeof p.sourceLinkIndex === 'number') {
        return { type: 'move', sourceContainerIndex: p.sourceContainerIndex, sourceLinkIndex: p.sourceLinkIndex }
      }
      if (p.type === 'new' && typeof p.link === 'string') return { type: 'new', link: p.link }
      const ref = p.type === 'equipped' ? parseEquippedRef(p.ref) : undefined
      if (ref) return { type: 'equipped', ref }
    }
  } catch {
    // Not JSON — treat the raw string itself as a wikilink (defensive; every drag source in this
    // feature sets JSON, but a drop from somewhere unexpected shouldn't crash the handler).
  }
  return { type: 'new', link: raw }
}

/**
 * The Resident-Evil-style slot-grid inventory for characters using the new "Endeavour"
 * container/`Plaetze` system (`character.endeavour_inventory`) — see the feature's plan doc. Shows
 * every equipped container at once (main `Gepäck` backpack(s) as full grids, 1-slot `Schnellzugriff`
 * pouches as a small row), a vault-wide item search that places into any of them, and the selected
 * item's details. Entries are vault-item wikilinks or player-created temporary items
 * (`EndeavourCustomItem`) for gear the DM hasn't written a page for yet.
 */
export function EndeavourInventoryGrid({
  character,
  characterPath,
  index,
}: {
  character: CharacterFrontmatter
  characterPath: string
  index: VaultIndex
}) {
  const t = useT()
  const setEndeavourInventory = useVaultStore((s) => s.setEndeavourInventory)
  const setEquipment = useVaultStore((s) => s.setEquipment)
  const rawFiles = useVaultStore((s) => s.rawFiles)
  const vaultEndeavourItems = useVaultStore((s) => s.vault.endeavourItems)
  const canEdit = useCanEdit()
  const containers = useMemo(() => character.endeavour_inventory?.containers ?? [], [character.endeavour_inventory])

  const [selected, setSelected] = useState<SelectedGridItem | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const resolved = useMemo(() => resolveContainers(containers, index), [containers, index])

  const quickContainers = resolved.filter((r) => r.capacity === 1)
  const mainContainers = resolved.filter((r) => r.capacity !== 1)
  const containerOptions: ContainerOption[] = resolved.map((r) => ({ index: r.containerIndex, label: r.name }))
  const searchableItems = vaultEndeavourItems.filter((i) => i.frontmatter.kind !== 'container')

  function commit(nextContainers: EndeavourContainerSlotAssignment[]) {
    void setEndeavourInventory(characterPath, nextContainers)
  }

  function updateAssignment(containerIndex: number, nextItems: EndeavourInventoryEntry[]) {
    commit(containers.map((c, i) => (i === containerIndex ? { ...c, items: nextItems } : c)))
  }

  function removeTile(containerIndex: number, linkIndex: number) {
    if (!canEdit) return // defense in depth — the remove button itself is hidden when !canEdit
    const assignment = containers[containerIndex]
    if (!assignment) return
    updateAssignment(
      containerIndex,
      assignment.items.filter((_, i) => i !== linkIndex),
    )
  }

  function selectTile(r: ResolvedContainer, linkIndex: number) {
    const tile = r.layout.tiles.find((tile) => tile.linkIndex === linkIndex)
    if (tile) setSelected({ key: tile.key, item: tile.item, custom: tile.custom, containerIndex: r.containerIndex, linkIndex })
  }

  /** How many units share one slot (`Stapelgroesse`), or `undefined` when the item doesn't stack —
   * any vault-resolved item with a `stack_size` > 1 (torches, throwing knives, ...) tracks a count. */
  function stackSizeFor(link: string): number | undefined {
    const fm = resolveEndeavourItemLink(index, link)?.frontmatter
    return fm?.stack_size !== undefined && fm.stack_size > 1 ? fm.stack_size : undefined
  }

  /** Wraps a freshly-placed wikilink into a charge-tracking `EndeavourStackEntry` when the item is a
   * stackable consumable, starting at its full `stack_size`; every other item stays a plain string. */
  function entryForLink(link: string): EndeavourInventoryEntry {
    const size = stackSizeFor(link)
    return size !== undefined ? { link, charges: size } : link
  }

  /** Fresh copy of an entry so placing several copies in one `addEntries` call gives each tile its
   * own independent `charges` counter rather than sharing one object reference. */
  function freshCopy(entry: EndeavourInventoryEntry): EndeavourInventoryEntry {
    return isCustomEntry(entry) || isStackEntry(entry) ? { ...entry } : entry
  }

  /** Adjusts a placed stack's remaining uses, clamped to `[0, stack_size]`. No-op for anything that
   * isn't a charge-tracking entry. */
  function setCharges(containerIndex: number, linkIndex: number, next: number) {
    if (!canEdit) return // defense in depth — the stepper itself only renders when canEdit
    const assignment = containers[containerIndex]
    const entry = assignment?.items[linkIndex]
    if (!entry || !isStackEntry(entry)) return
    const max = stackSizeFor(entry.link) ?? entry.charges
    const clamped = Math.max(0, Math.min(max, Math.round(next)))
    if (clamped === entry.charges) return
    // Used up: the empty stack leaves the inventory (and the selection, which pointed at it).
    if (clamped === 0) {
      updateAssignment(
        containerIndex,
        assignment.items.filter((_, i) => i !== linkIndex),
      )
      setSelected(null)
      return
    }
    updateAssignment(
      containerIndex,
      assignment.items.map((it, i) => (i === linkIndex ? { ...entry, charges: clamped } : it)),
    )
  }

  /** See `tryPlaceEntry` — bound to this character's containers. */
  function tryPlace(currentItems: EndeavourInventoryEntry[], entry: EndeavourInventoryEntry, containerIndex: number) {
    return tryPlaceEntry(resolved, index, currentItems, entry, containerIndex)
  }

  /** Commits an equip/unequip (see `equipment.ts`), or explains why it can't happen. On success the
   * selection follows the item: onto its loadout slot when equipped, cleared when stowed (the
   * inventory's indices have shifted, so a tile selection would point at the wrong item). */
  function applyEquip(result: EquipResult, select?: EquippedRef) {
    if (!result.ok) {
      const name = result.name ?? '?'
      if (result.reason === 'not_equippable') setWarning(t('equipment.warningNotEquippable', { name }))
      else setWarning(t(result.reason === 'too_big' ? 'equipment.warningTooBig' : 'equipment.warningNoRoom', { name }))
      return
    }
    void setEquipment(characterPath, result.change)
    setWarning(null)
    const link = select ? equippedLink({ ...character, ...equipmentChangeFields(result.change) }, select) : undefined
    setSelected(select && link ? { key: equippedKey(select), item: resolveEndeavourItemLink(index, link), equipped: select } : null)
  }

  function equipTile(containerIndex: number, linkIndex: number, ringPosition?: number) {
    if (!canEdit) return // defense in depth — the equip controls only render when canEdit
    const result = equipFromInventory(character, index, containerIndex, linkIndex, ringPosition)
    applyEquip(result, result.ok ? result.equipped : undefined)
  }

  function equipLinkNew(link: string, ringPosition?: number) {
    if (!canEdit) return
    const result = equipNew(character, index, link, ringPosition)
    applyEquip(result, result.ok ? result.equipped : undefined)
  }

  function unequipRef(ref: EquippedRef, targetContainerIndex?: number) {
    if (!canEdit) return
    applyEquip(unequip(character, index, ref, targetContainerIndex))
  }

  /** A drop on the loadout; `ringPosition` is set when it landed on one of the ring slots. */
  function handleLoadoutDrop(raw: string, ringPosition?: number) {
    if (!canEdit) {
      setWarning(t('endeavourInventory.editLocked'))
      return
    }
    const payload = parseDropPayload(raw)
    if (payload.type === 'move') equipTile(payload.sourceContainerIndex, payload.sourceLinkIndex, ringPosition)
    else if (payload.type === 'new') equipLinkNew(payload.link, ringPosition)
  }

  function warningMessage(reason: PlaceFailure, entry: EndeavourInventoryEntry, containerIndex: number): string {
    const itemFile = resolveEntry(index, entry)
    const name = itemFile?.frontmatter.name ?? (isCustomEntry(entry) ? entry.name : isStackEntry(entry) ? entry.link : entry)
    if (reason === 'no_room') return t('endeavourInventory.warningNoRoom', { name })

    const itemSize = itemFile ? resolveItemSize(itemFile.frontmatter) : undefined
    const target = resolved.find((r) => r.containerIndex === containerIndex)
    const size = itemSize ? t(`endeavourInventory.size.${itemSize}` as TranslationKey) : ''
    const maxSize = target?.maxSize ? t(`endeavourInventory.size.${target.maxSize}` as TranslationKey) : ''
    // Spell out why (rule `Gegenstandsgrößen`: the size is the slot count, and a container caps the
    // size of each single item) — otherwise a refusal with plenty of free slots looks like a bug.
    const slots = itemFile ? resolveSlotCost(itemFile.frontmatter) : undefined
    const maxSlots = target?.maxSize ? MAX_SLOTS_FOR_SIZE[target.maxSize] : undefined
    if (slots !== undefined && maxSlots !== undefined && target) {
      return t('endeavourInventory.warningTooBigSlots', { name, container: target.name, slots, size, maxSize, maxSlots })
    }
    return t('endeavourInventory.warningTooBig', { name, size, maxSize })
  }

  function placeNew(link: string, containerIndex: number) {
    const assignment = containers[containerIndex]
    if (!assignment) return
    const entry = entryForLink(link)
    const result = tryPlace(assignment.items, entry, containerIndex)
    if (!result.ok) {
      setWarning(warningMessage(result.reason, entry, containerIndex))
      return
    }
    updateAssignment(containerIndex, result.items)
    setWarning(null)
  }

  /** Moves an already-placed tile to a different container in one step (drag from one
   * `ContainerGrid` onto another) — checked and committed atomically so a failed target placement
   * never removes the item from its source. Dropping onto the same container it's already in is a
   * no-op (reordering within a container isn't supported — the grid packs by list order alone). */
  function moveTile(sourceContainerIndex: number, sourceLinkIndex: number, targetContainerIndex: number) {
    if (sourceContainerIndex === targetContainerIndex) return
    const sourceAssignment = containers[sourceContainerIndex]
    const entry = sourceAssignment?.items[sourceLinkIndex]
    if (!sourceAssignment || entry === undefined) return

    const targetAssignment = containers[targetContainerIndex]
    if (!targetAssignment) return

    const result = tryPlace(targetAssignment.items, entry, targetContainerIndex)
    if (!result.ok) {
      setWarning(warningMessage(result.reason, entry, targetContainerIndex))
      return
    }

    commit(
      containers.map((c, i) => {
        if (i === sourceContainerIndex) return { ...c, items: sourceAssignment.items.filter((_, j) => j !== sourceLinkIndex) }
        if (i === targetContainerIndex) return { ...c, items: result.items }
        return c
      }),
    )
    setWarning(null)
  }

  function handleDrop(raw: string, containerIndex: number) {
    if (!canEdit) {
      setWarning(t('endeavourInventory.editLocked'))
      return
    }
    const payload = parseDropPayload(raw)
    if (payload.type === 'move') moveTile(payload.sourceContainerIndex, payload.sourceLinkIndex, containerIndex)
    else if (payload.type === 'equipped') unequipRef(payload.ref, containerIndex)
    else placeNew(payload.link, containerIndex)
  }

  /** Places `quantity` separate copies of `entry` (one tile each — a stackable item's tile is a full stack),
   * stopping at the first that doesn't fit and reporting how many made it. */
  function addEntries(entry: EndeavourInventoryEntry, containerIndex: number, quantity: number) {
    if (!canEdit) return // defense in depth — ItemSearchPanel's "add" buttons are disabled when !canEdit
    const assignment = containers[containerIndex]
    if (!assignment) return

    const seed = typeof entry === 'string' ? entryForLink(entry) : entry
    let items = assignment.items
    let placed = 0
    let failure: PlaceFailure | null = null
    for (let i = 0; i < quantity; i++) {
      const result = tryPlace(items, freshCopy(seed), containerIndex)
      if (!result.ok) {
        failure = result.reason
        break
      }
      items = result.items
      placed++
    }

    if (placed > 0) updateAssignment(containerIndex, items)

    if (!failure) setWarning(null)
    else if (placed === 0) setWarning(warningMessage(failure, entry, containerIndex))
    else setWarning(t('endeavourInventory.warningPartial', { placed, requested: quantity }))
  }

  /** Fallback for gear the DM hasn't written a vault page for yet. Refuses a name that already
   * exists in the vault (case-insensitive) so a temporary item never shadows/duplicates a real one —
   * the player should add the real item via the search instead. */
  function handleAddCustom(name: string, plaetze: number, containerIndex: number, quantity: number) {
    const lower = name.trim().toLowerCase()
    if (vaultEndeavourItems.some((i) => i.frontmatter.name.trim().toLowerCase() === lower)) {
      setWarning(t('endeavourInventory.warningDuplicate', { name }))
      return
    }
    addEntries({ name, plaetze }, containerIndex, quantity)
  }

  const mainCapacity = mainContainers[0]

  const selContainerIndex = selected?.containerIndex
  const selLinkIndex = selected?.linkIndex
  const selectedEntry =
    selContainerIndex !== undefined && selLinkIndex !== undefined ? containers[selContainerIndex]?.items[selLinkIndex] : undefined
  // An equipped weapon stack (throwing knives in hand) tracks its charges on the character instead.
  const selEquipped = selected?.equipped
  const equippedPosition = selEquipped?.slot === 'weapon' ? selEquipped.position : undefined
  const equippedEntry = equippedPosition !== undefined ? character.attack_entries?.[equippedPosition] : undefined
  const selectedCharges = isEquippedStack(equippedEntry)
    ? equippedEntry.charges
    : selectedEntry && isStackEntry(selectedEntry)
      ? selectedEntry.charges
      : undefined
  const onChangeSelectedCharges = !canEdit
    ? undefined
    : equippedPosition !== undefined && isEquippedStack(equippedEntry)
      ? (next: number) => {
          const change = setEquippedCharges(character, index, equippedPosition, next)
          if (!change) return
          void setEquipment(characterPath, change)
          if (change.attack_entries && change.attack_entries.length < (character.attack_entries?.length ?? 0)) setSelected(null)
        }
      : selContainerIndex !== undefined && selLinkIndex !== undefined
        ? (next: number) => setCharges(selContainerIndex, selLinkIndex, next)
        : undefined
  // Equipment lives on the character's own note (Nimble own schema only).
  const canEquip = Boolean(character._write?.equipment)
  const equipAction = canEdit && canEquip && selected ? selectedEquipAction(selected) : undefined

  /** The detail panel's button: "take off" for an equipped item, "put on"/"equip" — with what it
   * would change — for armor, a shield or a weapon in the inventory or the search results. */
  function selectedEquipAction(sel: SelectedGridItem): EquipAction | undefined {
    if (sel.equipped) {
      const ref = sel.equipped
      return { kind: 'unequip', label: t('equipment.unequip'), onClick: () => unequipRef(ref) }
    }
    const slot = sel.custom ? undefined : equipSlotOf(sel.item?.frontmatter)
    if (!slot || !sel.item) return undefined

    const { containerIndex, linkIndex } = sel
    const link = `[[${sel.item.frontmatter.name}]]`
    const fromTile = containerIndex !== undefined && linkIndex !== undefined
    const result = fromTile ? equipFromInventory(character, index, containerIndex, linkIndex) : equipNew(character, index, link)
    if (!result.ok) return undefined
    // What the equip would swap back into the pack: the item worn in that slot (or on that finger).
    const at = result.equipped
    const previous = at?.slot === 'ring' ? character.rings?.[at.position] : at && at.slot !== 'weapon' ? character[at.slot] : undefined
    return {
      kind: 'equip',
      label: t(slot === 'weapon' ? 'equipment.equipWield' : 'equipment.equipWear'),
      onClick: () => (fromTile ? equipTile(containerIndex, linkIndex) : equipLinkNew(link)),
      preview: equipPreview(result.change),
      note: previous ? t('equipment.swapNote', { name: resolveEndeavourItemLink(index, previous)?.frontmatter.name ?? wikilinkTarget(previous) }) : undefined,
    }
  }

  /** Armor class, evasion, block and new attacks before → after `change`, computed with the same
   * derivation the sheet uses (`deriveEquipment`). */
  function equipPreview(change: EquipmentChange): EquipPreviewLine[] {
    const next = { ...character, ...equipmentChangeFields(change) }
    const after = { ...next, ...deriveEquipment(next, rawFiles) }
    const lines: EquipPreviewLine[] = []
    if (change.armor !== undefined) {
      lines.push({ label: t('stats.armorClass'), from: String(character.armor_class), to: String(after.armor_class), change: after.armor_class - character.armor_class })
      const before = evasionValue(character)
      const now = evasionValue(after)
      if (before !== undefined && now !== undefined) lines.push({ label: t('stats.evasion'), from: String(before), to: String(now), change: now - before })
    }
    if (change.shield !== undefined) {
      const before = shieldBlock(index, character.shield)
      const now = shieldBlock(index, next.shield)
      const label = (link: string | undefined, value: number) => (link ? t('equipment.block', { value }) : '—')
      lines.push({ label: t('equipment.shield'), from: label(character.shield, before), to: label(next.shield, now), change: now - before })
    }
    if (change.attack_entries) {
      const known = new Set((character.attacks ?? []).map((a) => a.name))
      for (const attack of after.attacks ?? []) {
        if (!known.has(attack.name)) lines.push({ label: attack.name, from: '', to: attackSummary(attack), change: 0 })
      }
    }
    return lines
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-4">
        {canEquip && (
          <EquipmentLoadout
            character={character}
            index={index}
            canEdit={canEdit}
            selectedKey={selected?.key}
            onSelect={(ref, item) => setSelected({ key: equippedKey(ref), item, equipped: ref })}
            onUnequip={(ref) => unequipRef(ref)}
            onDropPayload={handleLoadoutDrop}
          />
        )}

        {quickContainers.length > 0 && (
          <div>
            <SectionTitle className="mb-2">{t('endeavourInventory.quickSlots')}</SectionTitle>
            <div className="flex flex-wrap gap-3">
              {quickContainers.map((r) => (
                <div key={r.containerIndex} className="w-32">
                  <ContainerGrid
                    label={r.name}
                    layout={r.layout}
                    containerIndex={r.containerIndex}
                    columns={1}
                    compact
                    selectedLinkIndex={r.layout.tiles.find((tile) => tile.key === selected?.key)?.linkIndex}
                    onSelectTile={(linkIndex) => selectTile(r, linkIndex)}
                    onRemoveTile={(linkIndex) => removeTile(r.containerIndex, linkIndex)}
                    onEquipTile={canEquip ? (linkIndex) => equipTile(r.containerIndex, linkIndex) : undefined}
                    onDropPayload={(raw) => handleDrop(raw, r.containerIndex)}
                    canEdit={canEdit}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {resolved.length === 0 && <p className="text-sm text-fg-muted">{t('endeavourInventory.noContainers')}</p>}

        {mainContainers.map((r) => (
          <ContainerGrid
            key={r.containerIndex}
            label={r.name || t('endeavourInventory.backpack')}
            layout={r.layout}
            containerIndex={r.containerIndex}
            selectedLinkIndex={r.layout.tiles.find((tile) => tile.key === selected?.key)?.linkIndex}
            onSelectTile={(linkIndex) => selectTile(r, linkIndex)}
            onRemoveTile={(linkIndex) => removeTile(r.containerIndex, linkIndex)}
            onEquipTile={canEquip ? (linkIndex) => equipTile(r.containerIndex, linkIndex) : undefined}
            onDropPayload={(raw) => handleDrop(raw, r.containerIndex)}
            canEdit={canEdit}
          />
        ))}

        <div className="flex flex-wrap items-stretch gap-3">
          <div className="flex min-w-64 flex-1">
            <CurrencyDisplay currency={character.currency} characterPath={characterPath} writeTargets={character._write} />
          </div>
          {mainCapacity && (
            <div className="w-40">
              <CapacityBar used={mainCapacity.layout.used} capacity={mainCapacity.capacity} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {!canEdit && <div className="rounded-md border border-l-4 border-trim/50 bg-trim/10 px-3 py-2 text-sm text-fg-muted">{t('endeavourInventory.editLocked')}</div>}
        <ItemSearchPanel
          items={searchableItems}
          containerOptions={containerOptions}
          onAdd={addEntries}
          onAddCustom={handleAddCustom}
          onSelect={setSelected}
          selectedKey={selected?.key}
          canEdit={canEdit}
        />
        {warning && <div role="alert" className="rounded-md border border-l-4 border-danger/60 bg-danger/10 px-3 py-2 text-sm text-danger">{warning}</div>}
        <ItemDetailPanel selected={selected} charges={selectedCharges} onChangeCharges={onChangeSelectedCharges} equipAction={equipAction} />
      </div>
    </div>
  )
}

/** What `Blocken` adds with this shield: its `RK` (0 without one). */
function shieldBlock(index: VaultIndex, link: string | undefined): number {
  const fm = link ? resolveEndeavourItemLink(index, link)?.frontmatter : undefined
  return fm && (fm.kind === 'shield' || fm.kind === 'armor') ? (fm.rk ?? 0) : 0
}

/** `+2 · 1d6+2 Wuchtschaden` — an attack's bonus and damage in one line. */
function attackSummary(attack: WeaponAttack): string {
  const damage = `${attack.damage_dice}${attack.damage_bonus ? formatModifier(attack.damage_bonus) : ''}`
  return `${formatModifier(attack.attack_bonus)} · ${damage}${attack.damage_type ? ` ${attack.damage_type}` : ''}`
}
