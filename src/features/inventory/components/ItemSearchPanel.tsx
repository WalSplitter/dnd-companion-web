import { useMemo, useState } from 'react'
import { useT } from '../../../i18n/I18nContext'
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
 * quantity + "Hinzufügen" fallback (adds `quantity` separate tiles, per the mockup's annotation that
 * multiple units are *not* stacked into one cell).
 */
export function ItemSearchPanel({
  items,
  containerOptions,
  onAdd,
  onSelect,
  selectedLink,
}: {
  items: VaultFile<EndeavourItemFrontmatter>[]
  containerOptions: ContainerOption[]
  onAdd: (link: string, containerIndex: number, quantity: number) => void
  onSelect: (selected: SelectedGridItem) => void
  selectedLink: string | undefined
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [targetIndex, setTargetIndex] = useState(containerOptions[0]?.index ?? 0)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return items.filter((i) => i.frontmatter.name.toLowerCase().includes(q)).slice(0, 20)
  }, [items, query])

  const selectedResult = results.find((r) => `[[${r.frontmatter.name}]]` === selectedLink)
  const validTargetIndex = containerOptions.some((o) => o.index === targetIndex) ? targetIndex : containerOptions[0]?.index

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-fg-muted" htmlFor="endeavour-item-search">
        {t('endeavourInventory.searchLabel')}
      </label>
      <input
        id="endeavour-item-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('endeavourInventory.searchPlaceholder')}
        className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-fg"
      />

      {query.trim() && (
        <ul className="mt-2 max-h-48 divide-y divide-border overflow-y-auto">
          {results.length === 0 && <li className="py-2 text-xs text-fg-muted">{t('endeavourInventory.searchNoResults')}</li>}
          {results.map((result) => {
            const link = `[[${result.frontmatter.name}]]`
            return (
              <li
                key={result.path}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'new', link }))}
                onClick={() => onSelect({ link, item: result })}
                className={`flex items-center gap-2 cursor-grab py-1.5 text-sm hover:text-accent ${selectedLink === link ? 'font-medium text-accent' : 'text-fg'}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${KIND_DOT_CLASSES[result.frontmatter.kind]}`} />
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
              className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-fg"
            >
              {containerOptions.map((opt) => (
                <option key={opt.index} value={opt.index}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted" htmlFor="endeavour-quantity">
              {t('endeavourInventory.quantity')}
            </label>
            <input
              id="endeavour-quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.round(Number(e.target.value)) || 1))}
              className="w-16 rounded-md border border-border bg-surface-2 px-2 py-1 text-center text-sm text-fg"
            />
          </div>
          <button
            type="button"
            disabled={!selectedResult || validTargetIndex === undefined}
            onClick={() => {
              if (!selectedResult || validTargetIndex === undefined) return
              onAdd(`[[${selectedResult.frontmatter.name}]]`, validTargetIndex, quantity)
            }}
            className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            {t('endeavourInventory.addToInventory')}
          </button>
        </div>
      )}
    </div>
  )
}
