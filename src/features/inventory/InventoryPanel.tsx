import { useMemo, useState, type ReactNode } from 'react'
import { Card } from '../../components/Card'
import { useT } from '../../i18n/useI18n'
import { useVaultStore } from '../../store/vaultStore'
import { useCanEdit } from '../../store/canEdit'
import type { CharacterFrontmatter, InventoryEntry } from '../../vault/types'
import { wikilinkTarget } from '../../vault/wikilinkSyntax'
import { resolveItemLink, type VaultIndex } from '../../vault/wikilinks'
import { CurrencyDisplay } from './components/CurrencyDisplay'
import { EndeavourInventoryGrid } from './components/EndeavourInventoryGrid'
import { ItemList } from './components/ItemList'
import { encodeDragPayload, parseListDrop } from './dragPayload'
import { addEntry, hasEntry, moveEntry, removeEntry, type InventorySection, type ListInventory } from './listInventory'

function entryWeight(entry: InventoryEntry, index: VaultIndex): number {
  if (typeof entry === 'string') {
    const item = resolveItemLink(index, entry)
    if (!item?.frontmatter.weight_lb) return 0
    return item.frontmatter.weight_lb * (item.frontmatter.quantity ?? 1)
  }
  if (!entry.weight_lb) return 0
  return entry.weight_lb * (entry.quantity ?? 1)
}

export function InventoryPanel({
  character,
  characterPath,
  index,
}: {
  character: CharacterFrontmatter
  characterPath: string
  index: VaultIndex
}) {
  const t = useT()
  const canEdit = useCanEdit()
  const setInventory = useVaultStore((s) => s.setInventory)
  const [warning, setWarning] = useState<string | null>(null)

  if (character.endeavour_inventory) {
    return <EndeavourInventoryGrid character={character} characterPath={characterPath} index={index} />
  }

  const inventory = character.inventory
  const equipped = inventory?.equipped ?? []
  const carried = inventory?.carried ?? []
  const totalWeight = [...equipped, ...carried].reduce((sum, entry) => sum + entryWeight(entry, index), 0)

  // Own schema only: a legacy sheet's inventory is a markdown table this can't rewrite.
  const editable = canEdit && Boolean(character._write?.inventory)

  function commit(next: ListInventory | undefined) {
    if (!next) return
    setWarning(null)
    void setInventory(characterPath, next)
  }

  function add(section: InventorySection, link: string) {
    if (hasEntry(inventory, section, link)) {
      setWarning(t('inventory.alreadyListed', { name: wikilinkTarget(link) }))
      return
    }
    commit(addEntry(inventory, section, link))
  }

  function handleDrop(section: InventorySection, raw: string) {
    const payload = parseListDrop(raw)
    if (!payload) return
    if (payload.type === 'list-new') add(section, payload.link)
    else if (payload.section !== section) commit(moveEntry(inventory, payload.section, payload.position))
  }

  const actionsFor = (section: InventorySection) =>
    editable
      ? {
          moveLabel: t(section === 'equipped' ? 'inventory.moveToCarried' : 'inventory.moveToEquipped'),
          moveIcon: section === 'equipped' ? ('down' as const) : ('up' as const),
          onMove: (position: number) => commit(moveEntry(inventory, section, position)),
          onRemove: (position: number) => commit(removeEntry(inventory, section, position)),
        }
      : undefined

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {editable && (
        <div className="space-y-2 md:col-span-2">
          <ItemSearchCard onAdd={add} />
          {warning && <div role="alert" className="rounded-md border border-l-4 border-danger/60 bg-danger/10 px-3 py-2 text-sm text-danger">{warning}</div>}
        </div>
      )}
      <DropCard title={t('cards.equipped')} enabled={editable} onDrop={(raw) => handleDrop('equipped', raw)}>
        <ItemList entries={equipped} index={index} emptyLabel={t('inventory.nothingEquipped')} characterPath={characterPath} section="equipped" actions={actionsFor('equipped')} />
      </DropCard>
      <DropCard title={t('cards.carried')} enabled={editable} onDrop={(raw) => handleDrop('carried', raw)}>
        <ItemList entries={carried} index={index} emptyLabel={t('inventory.backpackEmpty')} characterPath={characterPath} section="carried" actions={actionsFor('carried')} />
      </DropCard>
      {editable && <p className="-mt-2 text-xs text-fg-muted md:col-span-2">{t('inventory.dragHint')}</p>}
      <Card title={t('cards.currency')}>
        <CurrencyDisplay currency={character.currency} characterPath={characterPath} writeTargets={character._write} />
      </Card>
      <Card title={t('cards.totalWeight')}>
        <div className="text-2xl font-bold text-fg">{t('inventory.weightValue', { value: totalWeight })}</div>
      </Card>
    </div>
  )
}

/** A list card that accepts dropped rows and search results while editing, lighting up on drag-over. */
function DropCard({ title, enabled, onDrop, children }: { title: string; enabled: boolean; onDrop: (raw: string) => void; children: ReactNode }) {
  const [over, setOver] = useState(false)
  if (!enabled) return <Card title={title}>{children}</Card>
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const raw = e.dataTransfer.getData('text/plain')
        if (raw) onDrop(raw)
      }}
      className="h-full"
    >
      <Card title={title} className={`h-full transition-shadow ${over ? 'equip-loadout-over' : ''}`}>
        {children}
      </Card>
    </div>
  )
}

/** Searches every item in the vault (native `type: item` notes and Endeavour item notes) and adds
 * one to either list — with its buttons, or by dragging a result onto a list. */
function ItemSearchCard({ onAdd }: { onAdd: (section: InventorySection, link: string) => void }) {
  const t = useT()
  const items = useVaultStore((s) => s.vault.items)
  const endeavourItems = useVaultStore((s) => s.vault.endeavourItems)
  const [query, setQuery] = useState('')

  const names = useMemo(() => {
    const all = [...items, ...endeavourItems].map((i) => i.frontmatter.name)
    return [...new Set(all)].sort((a, b) => a.localeCompare(b))
  }, [items, endeavourItems])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? names.filter((n) => n.toLowerCase().includes(q)).slice(0, 20) : []
  }, [names, query])

  return (
    <Card title={<label htmlFor="inventory-item-search">{t('inventory.searchLabel')}</label>}>
      <input
        id="inventory-item-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('inventory.searchPlaceholder')}
        className="rpg-input"
      />
      {query.trim() && (
        <ul className="mt-2 max-h-56 divide-y divide-trim/15 overflow-y-auto">
          {results.length === 0 && <li className="py-2 text-xs text-fg-muted">{t('inventory.searchNoResults')}</li>}
          {results.map((name) => {
            const link = `[[${name}]]`
            return (
              <li
                key={name}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', encodeDragPayload({ type: 'list-new', link }))}
                className="flex cursor-grab items-center gap-2 px-1.5 py-1.5 text-sm text-fg"
              >
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <button type="button" aria-label={t('inventory.addEquippedAria', { name })} onClick={() => onAdd('equipped', link)} className="rpg-button !px-2.5 !py-1 text-xs">
                  {t('inventory.addEquipped')}
                </button>
                <button type="button" aria-label={t('inventory.addCarriedAria', { name })} onClick={() => onAdd('carried', link)} className="rpg-button !px-2.5 !py-1 text-xs">
                  {t('inventory.addCarried')}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
