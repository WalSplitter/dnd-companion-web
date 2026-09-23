import { useMemo, useState } from 'react'
import { SectionTitle } from '../../../components/SectionTitle'
import { useT } from '../../../i18n/useI18n'
import type { EndeavourItemFrontmatter } from '../../../vault/adapters/endeavourItem'
import type { VaultFile } from '../../../vault/types'
import { KIND_DOT_CLASSES } from '../itemColors'
import type { SelectedGridItem } from './ItemDetailPanel'

export interface ContainerOption {
  index: number
  label: string
}

/**
 * Searches every non-container item known to the loaded vault (per the mockup: "Suchfeld, wo man
 * nach allen verfügbaren Gegenständen in der Vault suchen kann") and lets the user place one into an
 * equipped container — either by dragging a result onto a `ContainerGrid`, or via this panel's own
 * "Hinzufügen" fallback. Each click adds one tile (per the mockup's annotation that multiple units
 * are *not* stacked into one cell) — clicking again adds another.
 *
 * Also hosts the fallback for gear the DM hasn't written a vault page for yet: a small form to create
 * a *temporary* item (name + slot cost), placed with the same target container control.
 * It's only ever stored on the character sheet — see `EndeavourCustomItem`.
 */
export function ItemSearchPanel({
  items,
  containerOptions,
  onAdd,
  onAddCustom,
  onSelect,
  selectedKey,
  canEdit,
}: {
  items: VaultFile<EndeavourItemFrontmatter>[]
  containerOptions: ContainerOption[]
  onAdd: (link: string, containerIndex: number, quantity: number) => void
  onAddCustom: (name: string, plaetze: number, containerIndex: number, quantity: number) => void
  onSelect: (selected: SelectedGridItem) => void
  selectedKey: string | undefined
  /** Disables placing anything (the "Hinzufügen" buttons and dragging a result onto a container) —
   * results stay browsable/selectable so the detail panel still works while locked. */
  canEdit: boolean
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [targetIndex, setTargetIndex] = useState(containerOptions[0]?.index ?? 0)
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customSlots, setCustomSlots] = useState(1)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return items.filter((i) => i.frontmatter.name.toLowerCase().includes(q)).slice(0, 20)
  }, [items, query])

  const selectedResult = results.find((r) => `[[${r.frontmatter.name}]]` === selectedKey)
  const validTargetIndex = containerOptions.some((o) => o.index === targetIndex) ? targetIndex : containerOptions[0]?.index

  return (
    <div className="rpg-panel p-4">
      <SectionTitle className="mb-2.5">
        <label htmlFor="endeavour-item-search">{t('endeavourInventory.searchLabel')}</label>
      </SectionTitle>
      <input
        id="endeavour-item-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('endeavourInventory.searchPlaceholder')}
        className="rpg-input"
      />

      {query.trim() && (
        <ul className="mt-2 max-h-48 divide-y divide-trim/15 overflow-y-auto">
          {results.length === 0 && <li className="py-2 text-xs text-fg-muted">{t('endeavourInventory.searchNoResults')}</li>}
          {results.map((result) => {
            const link = `[[${result.frontmatter.name}]]`
            return (
              <li
                key={result.path}
                draggable={canEdit}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'new', link }))}
                onClick={() => onSelect({ key: link, item: result })}
                className={`flex items-center gap-2 rounded-sm px-1.5 py-1.5 text-sm transition hover:bg-trim/10 ${canEdit ? 'cursor-grab' : 'cursor-pointer'} ${selectedKey === link ? 'bg-trim/15 font-medium text-trim' : 'text-fg'}`}
              >
                <span className={`size-2 shrink-0 rotate-45 ${KIND_DOT_CLASSES[result.frontmatter.kind]}`} />
                {result.frontmatter.name}
              </li>
            )
          })}
        </ul>
      )}

      {containerOptions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-fg-muted" htmlFor="endeavour-target-container">
              {t('endeavourInventory.targetContainer')}
            </label>
            <select
              id="endeavour-target-container"
              value={validTargetIndex}
              onChange={(e) => setTargetIndex(Number(e.target.value))}
              className="rpg-input"
            >
              {containerOptions.map((opt) => (
                <option key={opt.index} value={opt.index}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!canEdit || !selectedResult || validTargetIndex === undefined}
            onClick={() => {
              if (!selectedResult || validTargetIndex === undefined) return
              onAdd(`[[${selectedResult.frontmatter.name}]]`, validTargetIndex, 1)
            }}
            className="rpg-button"
          >
            {t('endeavourInventory.addToInventory')}
          </button>
        </div>
      )}

      {containerOptions.length > 0 && (
        <div className="mt-3 border-t border-trim/25 pt-2">
          <button
            type="button"
            aria-expanded={customOpen}
            onClick={() => {
              if (!customOpen && !customName) setCustomName(query.trim())
              setCustomOpen((open) => !open)
            }}
            className="cursor-pointer text-xs text-trim hover:underline"
          >
            {t('endeavourInventory.customToggle')}
          </button>

          {customOpen && (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="min-w-32 flex-1">
                <label className="mb-1 block text-xs text-fg-muted" htmlFor="endeavour-custom-name">
                  {t('endeavourInventory.customName')}
                </label>
                <input
                  id="endeavour-custom-name"
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="rpg-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-fg-muted" htmlFor="endeavour-custom-slots">
                  {t('endeavourInventory.customSlots')}
                </label>
                <input
                  id="endeavour-custom-slots"
                  type="number"
                  min={1}
                  value={customSlots}
                  onChange={(e) => setCustomSlots(Math.max(1, Math.round(Number(e.target.value)) || 1))}
                  className="rpg-input !w-16 text-center"
                />
              </div>
              <button
                type="button"
                disabled={!canEdit || !customName.trim() || validTargetIndex === undefined}
                onClick={() => {
                  if (!customName.trim() || validTargetIndex === undefined) return
                  onAddCustom(customName.trim(), customSlots, validTargetIndex, 1)
                }}
                className="rpg-button"
              >
                {t('endeavourInventory.customAdd')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
