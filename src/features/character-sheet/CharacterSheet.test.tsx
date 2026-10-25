import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../i18n/I18nContext'
import { useVaultStore } from '../../store/vaultStore'
import type { CharacterFrontmatter, VaultFile } from '../../vault/types'
import { CharacterSheet } from './CharacterSheet'

type VaultCharacter = VaultFile<CharacterFrontmatter>

function sheet(c: VaultCharacter) {
  const { index } = useVaultStore.getState()
  return (
    <I18nProvider>
      <MemoryRouter>
        <CharacterSheet character={c.frontmatter} characterPath={c.path} index={index} />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('CharacterSheet: switching characters', () => {
  let caster: VaultCharacter
  let other: VaultCharacter

  beforeAll(async () => {
    await useVaultStore.getState().loadSampleVault()
    const { characters } = useVaultStore.getState().vault
    caster = characters.find((c) => c.frontmatter.spellcasting)!
    other = characters.find((c) => !c.frontmatter.spellcasting) ?? characters.find((c) => c !== caster)!
  })

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
  })

  it('falls back to the sheet tab when the next character lacks the open one', () => {
    expect(caster && other && !other.frontmatter.spellcasting).toBe(true)
    const { rerender } = render(sheet(caster))
    const spellsTab = screen.getByRole('tab', { name: /zauber|spells/i })
    fireEvent.click(spellsTab)
    expect(spellsTab).toHaveAttribute('aria-selected', 'true')

    rerender(sheet(other))
    expect(screen.queryByRole('tab', { name: /zauber|spells/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true')).toBeDefined()
  })

  it("keeps the journal tab, but not the previous character's draft", () => {
    const { rerender } = render(sheet(caster))
    fireEvent.click(screen.getByRole('tab', { name: /tagebuch|journal/i }))
    const draft = screen.getAllByRole('textbox').find((el) => el.tagName === 'TEXTAREA')!
    fireEvent.change(draft, { target: { value: 'Nur für den ersten Charakter' } })

    rerender(sheet(other))
    expect(screen.getByRole('tab', { name: /tagebuch|journal/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByDisplayValue('Nur für den ersten Charakter')).not.toBeInTheDocument()
  })
})
