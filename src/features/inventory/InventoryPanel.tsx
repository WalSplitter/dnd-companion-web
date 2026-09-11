import { Card } from '../../components/Card'
import type { CharacterFrontmatter, InventoryEntry } from '../../vault/types'
import type { VaultIndex } from '../../vault/wikilinks'
import { resolveItemLink } from '../../vault/wikilinks'
import { CurrencyDisplay } from './components/CurrencyDisplay'
import { ItemList } from './components/ItemList'

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
  const equipped = character.inventory?.equipped ?? []
  const carried = character.inventory?.carried ?? []

  const totalWeight = [...equipped, ...carried].reduce((sum, entry) => sum + entryWeight(entry, index), 0)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card title="Equipped">
        <ItemList entries={equipped} index={index} emptyLabel="Nothing equipped." characterPath={characterPath} section="equipped" />
      </Card>
      <Card title="Carried">
        <ItemList entries={carried} index={index} emptyLabel="Backpack is empty." characterPath={characterPath} section="carried" />
      </Card>
      <Card title="Currency">
        <CurrencyDisplay currency={character.currency} />
      </Card>
      <Card title="Total Weight">
        <div className="text-2xl font-bold text-fg">{totalWeight} lb</div>
      </Card>
    </div>
  )
}
