import { useMemo, useState } from 'react'
import { SectionTitle } from '../../../components/SectionTitle'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import { useCanEdit, useVaultStore } from '../../../store/vaultStore'
import { compareEndeavourItemSize, resolveItemSize } from '../../../vault/adapters/endeavourItem'
import type { CharacterFrontmatter, EndeavourContainerSlotAssignment, EndeavourInventoryEntry } from '../../../vault/types'
import { resolveEndeavourItemLink, type VaultIndex } from '../../../vault/wikilinks'
import { isCustomEntry, isStackEntry, layoutContainer, resolveContainers, resolveEntry, type ResolvedContainer } from '../grid'
import type { MoveTilePayload } from './ItemTile'
import { CapacityBar } from './CapacityBar'
import { ContainerGrid } from './ContainerGrid'
import { CurrencyDisplay } from './CurrencyDisplay'
import { ItemDetailPanel, type SelectedGridItem } from './ItemDetailPanel'
import { ItemSearchPanel, type ContainerOption } from './ItemSearchPanel'

type PlaceFailure = 'too_big' | 'no_room'

/** A search result drop carries just the wikilink; a tile dragged from another container carries a
 * `MoveTilePayload` instead — see `ItemTile.tsx`. */
type DropPayload = { type: 'new'; link: string } | MoveTilePayload

function parseDropPayload(raw: string): DropPayload {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object') {
      const p = parsed as Record<string, unknown>
      if (p.type === 'move' && typeof p.sourceContainerIndex === 'number' && typeof p.sourceLinkIndex === 'number') {
        return { type: 'move', sourceContainerIndex: p.sourceContainerIndex, sourceLinkIndex: p.sourceLinkIndex }
      }
      if (p.type === 'new' && typeof p.link === 'string') return { type: 'new', link: p.link }
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
    updateAssignment(
      containerIndex,
      assignment.items.map((it, i) => (i === linkIndex ? { ...entry, charges: clamped } : it)),
    )
  }

  /** Pure attempt: checks size against the container's `max_size`, then whether it still fits
   * alongside `currentItems` — without touching state, so callers (single drop vs. a quantity loop
   * vs. a cross-container move) decide when to actually commit. */
  function tryPlace(
    currentItems: EndeavourInventoryEntry[],
    entry: EndeavourInventoryEntry,
    containerIndex: number,
  ): { ok: true; items: EndeavourInventoryEntry[] } | { ok: false; reason: PlaceFailure } {
    const target = resolved.find((r) => r.containerIndex === containerIndex)
    if (!target) return { ok: false, reason: 'no_room' }

    const itemFile = resolveEntry(index, entry)
    const itemSize = itemFile ? resolveItemSize(itemFile.frontmatter) : undefined
    if (itemSize && target.maxSize && compareEndeavourItemSize(itemSize, target.maxSize) > 0) {
      return { ok: false, reason: 'too_big' }
    }

    const nextItems = [...currentItems, entry]
    const layout = layoutContainer(nextItems, index, target.capacity)
    if (layout.overflow.some((o) => o.linkIndex === nextItems.length - 1)) return { ok: false, reason: 'no_room' }
    return { ok: true, items: nextItems }
  }

  function warningMessage(reason: PlaceFailure, entry: EndeavourInventoryEntry, containerIndex: number): string {
    const itemFile = resolveEntry(index, entry)
    const name = itemFile?.frontmatter.name ?? (isCustomEntry(entry) ? entry.name : isStackEntry(entry) ? entry.link : entry)
    if (reason === 'no_room') return t('endeavourInventory.warningNoRoom', { name })

    const itemSize = itemFile ? resolveItemSize(itemFile.frontmatter) : undefined
    const target = resolved.find((r) => r.containerIndex === containerIndex)
    const size = itemSize ? t(`endeavourInventory.size.${itemSize}` as TranslationKey) : ''
    const maxSize = target?.maxSize ? t(`endeavourInventory.size.${target.maxSize}` as TranslationKey) : ''
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
  const selectedCharges = selectedEntry && isStackEntry(selectedEntry) ? selectedEntry.charges : undefined
  const onChangeSelectedCharges =
    canEdit && selContainerIndex !== undefined && selLinkIndex !== undefined
      ? (next: number) => setCharges(selContainerIndex, selLinkIndex, next)
      : undefined

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-4">
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
        <ItemDetailPanel selected={selected} charges={selectedCharges} onChangeCharges={onChangeSelectedCharges} />
      </div>
    </div>
  )
}
