import { Card } from '../../components/Card'
import { useT } from '../../i18n/useI18n'
import type { CharacterFrontmatter, InventoryEntry } from '../../vault/types'
import type { VaultIndex } from '../../vault/wikilinks'
import { resolveItemLink } from '../../vault/wikilinks'
import { CurrencyDisplay } from './components/CurrencyDisplay'
import { EndeavourInventoryGrid } from './components/EndeavourInventoryGrid'
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
  const t = useT()

  if (character.endeavour_inventory) {
    return <EndeavourInventoryGrid character={character} characterPath={characterPath} index={index} />
  }

  const equipped = character.inventory?.equipped ?? []
  const carried = character.inventory?.carried ?? []

  const totalWeight = [...equipped, ...carried].reduce((sum, entry) => sum + entryWeight(entry, index), 0)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card title={t('cards.equipped')}>
        <ItemList entries={equipped} index={index} emptyLabel={t('inventory.nothingEquipped')} characterPath={characterPath} section="equipped" />
      </Card>
      <Card title={t('cards.carried')}>
        <ItemList entries={carried} index={index} emptyLabel={t('inventory.backpackEmpty')} characterPath={characterPath} section="carried" />
      </Card>
      <Card title={t('cards.currency')}>
        <CurrencyDisplay currency={character.currency} characterPath={characterPath} writeTargets={character._write} />
      </Card>
      <Card title={t('cards.totalWeight')}>
        <div className="text-2xl font-bold text-fg">{t('inventory.weightValue', { value: totalWeight })}</div>
      </Card>
    </div>
  )
}
