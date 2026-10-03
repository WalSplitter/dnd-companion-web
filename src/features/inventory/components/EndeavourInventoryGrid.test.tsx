import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DICTIONARIES, I18nContext, interpolate, type I18nContextValue } from '../../../i18n/useI18n'
import { useVaultStore } from '../../../store/vaultStore'
import type { EndeavourInventoryEntry } from '../../../vault/types'
import { VaultIndexProvider } from '../../../vault/VaultIndexContext'
import { EndeavourInventoryGrid } from './EndeavourInventoryGrid'

// Runs against the bundled sample vault through the real store: edits go to its in-memory sandbox
// writer, so every test checks what the grid hands the store, not just what it renders.

const BORIN = 'Borin Eisenfaust'
const BACKPACK = 0
const EMPTY_POUCH = 3

const i18n: I18nContextValue = { lang: 'en', setLang: () => {}, t: (key, vars) => interpolate(DICTIONARIES.en[key], vars) }

/** Re-reads the character from the store on every change, like the sheet page does. */
function Harness({ name }: { name: string }) {
  const file = useVaultStore((s) => s.vault.characters.find((c) => c.frontmatter.name === name))!
  const index = useVaultStore((s) => s.index)
  return (
    <I18nContext value={i18n}>
      <VaultIndexProvider index={index}>
        <EndeavourInventoryGrid character={file.frontmatter} characterPath={file.path} index={index} />
      </VaultIndexProvider>
    </I18nContext>
  )
}

const character = (name = BORIN) => useVaultStore.getState().vault.characters.find((c) => c.frontmatter.name === name)!.frontmatter
const items = (container: number, name = BORIN): EndeavourInventoryEntry[] => character(name).endeavour_inventory!.containers[container].items

/** The drop targets: the backpack by its heading (ß shown as capital ẞ), the pouches by their
 * caption — numbered, since Borin carries three of the same kind. */
const backpack = () => screen.getByText('Rucksack (Groẞ)')
const pouch = (n: number) => screen.getByTitle(`Gürteltasche ${n + 1}`)

function drop(target: HTMLElement, payload: unknown) {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload)
  fireEvent.drop(target, { dataTransfer: { getData: () => raw } })
}

const alert = () => screen.queryByRole('alert')

beforeEach(async () => {
  // Reopening the sample vault restores its pristine state and grants (in-memory) editing.
  await useVaultStore.getState().loadSampleVault()
})

describe('EndeavourInventoryGrid', () => {
  it('shows the backpack and every quick-access pouch with their items', () => {
    render(<Harness name={BORIN} />)
    expect(backpack()).toBeInTheDocument()
    expect(screen.getAllByTitle(/^Gürteltasche \d$/)).toHaveLength(3)
    expect(screen.getByRole('button', { name: /^Schlafsack/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Heiltrank/ })).toHaveLength(2)
  })

  it('removes a tile', () => {
    render(<Harness name={BORIN} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Schlafsack' }))
    expect(items(BACKPACK)).not.toContain('[[Schlafsack]]')
    expect(items(BACKPACK)).toHaveLength(8)
  })

  describe('drops', () => {
    it('places a search result dropped on a container', () => {
      render(<Harness name={BORIN} />)
      drop(backpack(), { type: 'new', link: '[[Zunderkästchen]]' })
      expect(items(BACKPACK).filter((e) => e === '[[Zunderkästchen]]')).toHaveLength(2)
      expect(alert()).toBeNull()
    })

    it('reads a drop that is not JSON as a plain wikilink', () => {
      render(<Harness name={BORIN} />)
      drop(pouch(2), '[[Ration]]')
      expect(items(EMPTY_POUCH)).toEqual(['[[Ration]]'])
    })

    it('places a stackable item as a full stack', () => {
      render(<Harness name={BORIN} />)
      drop(pouch(2), { type: 'new', link: '[[Kreide]]' })
      expect(items(EMPTY_POUCH)).toEqual([{ link: '[[Kreide]]', charges: 10 }])
    })

    it('refuses an item that is too big and explains why, leaving the inventory alone', () => {
      render(<Harness name={BORIN} />)
      const before = items(BACKPACK)
      drop(backpack(), { type: 'new', link: '[[Zelt]]' })
      expect(alert()).toHaveTextContent('Zelt')
      expect(items(BACKPACK)).toEqual(before)
    })

    it('reports a full container', () => {
      render(<Harness name={BORIN} />)
      drop(pouch(0), { type: 'new', link: '[[Ration]]' })
      expect(alert()).toHaveTextContent('No room left for "Ration"')
      expect(items(1)).toEqual(['[[Heiltrank]]'])
    })

    it('moves a tile to another container in one step', () => {
      render(<Harness name={BORIN} />)
      drop(pouch(2), { type: 'move', sourceContainerIndex: BACKPACK, sourceLinkIndex: 2 })
      expect(items(EMPTY_POUCH)).toEqual(['[[Zunderkästchen]]'])
      expect(items(BACKPACK)).not.toContain('[[Zunderkästchen]]')
    })

    it('keeps a tile where it was when the target has no room for it', () => {
      render(<Harness name={BORIN} />)
      const before = character().endeavour_inventory
      drop(pouch(0), { type: 'move', sourceContainerIndex: BACKPACK, sourceLinkIndex: 2 })
      expect(alert()).toBeInTheDocument()
      expect(character().endeavour_inventory).toEqual(before)
    })

    it('stows an equipped item dragged off the loadout into the container it lands on', () => {
      render(<Harness name={BORIN} />)
      drop(pouch(2), { type: 'equipped', ref: { slot: 'head' } })
      expect(character().head).toBeUndefined()
      expect(items(EMPTY_POUCH)).toEqual(['[[Lederkappe]]'])
    })
  })

  describe('charges', () => {
    it('uses up a stack charge by charge and drops the empty stack', () => {
      render(<Harness name={BORIN} />)
      fireEvent.click(screen.getByRole('button', { name: /^Fackel/ }))
      const useOne = () => fireEvent.click(screen.getByRole('button', { name: 'Use one charge' }))

      useOne()
      expect(items(BACKPACK)[3]).toEqual({ link: '[[Fackel]]', charges: 2 })
      useOne()
      useOne()
      expect(items(BACKPACK).some((e) => typeof e === 'object' && 'link' in e && e.link === '[[Fackel]]')).toBe(false)
      expect(screen.queryByRole('button', { name: 'Use one charge' })).toBeNull()
    })

    it('restores charges up to the stack size and no further', () => {
      render(<Harness name={BORIN} />)
      fireEvent.click(screen.getByRole('button', { name: /^Fackel/ }))
      const restore = screen.getByRole('button', { name: 'Restore one charge' })
      fireEvent.click(restore)
      fireEvent.click(restore)
      expect(items(BACKPACK)[3]).toEqual({ link: '[[Fackel]]', charges: 4 })
    })
  })

  describe('equipment', () => {
    it('equips a wearable from its tile into the matching slot', () => {
      render(<Harness name={BORIN} />)
      fireEvent.click(screen.getByRole('button', { name: 'Equip Amulett der Tiefe' }))
      expect(character().necklace).toBe('[[Amulett der Tiefe]]')
      expect(items(BACKPACK)).not.toContain('[[Amulett der Tiefe]]')
    })

    it('takes an item off from the loadout back into the pack', () => {
      render(<Harness name={BORIN} />)
      fireEvent.click(screen.getByRole('button', { name: 'Take off Lederkappe' }))
      expect(character().head).toBeUndefined()
      expect(items(BACKPACK)).toContain('[[Lederkappe]]')
    })

    it('offers a search result to put on, naming what goes back into the pack', () => {
      render(<Harness name={BORIN} />)
      fireEvent.change(screen.getByLabelText('Find item'), { target: { value: 'Reiseumhang' } })
      fireEvent.click(within(screen.getByRole('list')).getByText('Reiseumhang'))
      expect(screen.getByText('Reiseumhang goes back into your pack.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Put on' })).toBeInTheDocument()
    })
  })

  describe('search panel', () => {
    it('adds the selected search result to the chosen container', () => {
      render(<Harness name={BORIN} />)
      fireEvent.change(screen.getByLabelText('Find item'), { target: { value: 'Kreide' } })
      fireEvent.click(within(screen.getByRole('list')).getByText('Kreide'))
      fireEvent.change(screen.getByLabelText('Place in'), { target: { value: String(EMPTY_POUCH) } })
      fireEvent.click(screen.getByRole('button', { name: 'Add to inventory' }))
      expect(items(EMPTY_POUCH)).toEqual([{ link: '[[Kreide]]', charges: 10 }])
    })

    it('creates a temporary item, but never one named like a vault item', () => {
      render(<Harness name={BORIN} />)
      fireEvent.click(screen.getByRole('button', { name: 'Not in the vault? Create a temporary item' }))
      const name = screen.getByLabelText('Name')
      const add = screen.getByRole('button', { name: 'Add temporary item' })

      fireEvent.change(name, { target: { value: 'fackel' } })
      fireEvent.click(add)
      expect(alert()).toHaveTextContent('already exists in the vault')

      fireEvent.change(name, { target: { value: 'Kompass' } })
      fireEvent.click(add)
      expect(items(BACKPACK)).toContainEqual({ name: 'Kompass', plaetze: 1 })
      expect(alert()).toBeNull()
    })
  })

  describe('while editing is locked', () => {
    beforeEach(() => useVaultStore.setState({ editPermission: 'denied' }))

    it('still shows the items, without remove or equip controls', () => {
      render(<Harness name={BORIN} />)
      expect(screen.getByRole('button', { name: /^Schlafsack/ })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull()
      expect(screen.queryByRole('button', { name: /^Equip / })).toBeNull()
    })

    it('refuses drops with a hint and changes nothing', () => {
      render(<Harness name={BORIN} />)
      const before = character().endeavour_inventory
      drop(backpack(), { type: 'new', link: '[[Ration]]' })
      expect(alert()).toHaveTextContent('Enable editing')
      expect(character().endeavour_inventory).toEqual(before)
    })
  })
})
