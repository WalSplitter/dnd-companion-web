import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Combobox, type ComboboxOption } from './Combobox'

const OPTIONS: ComboboxOption[] = [{ value: 'me/vault' }, { value: 'me/notes' }, { value: 'friend/campaign', badge: 'shared' }]

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <Combobox id="repo" value={value} onChange={setValue} options={OPTIONS} />
}

const input = () => screen.getByRole('combobox') as HTMLInputElement
const optionTexts = () => screen.queryAllByRole('option').map((o) => o.textContent)

describe('Combobox', () => {
  it('shows every option on click, even when the field already holds one', () => {
    render(<Harness initial="me/vault" />)
    fireEvent.click(input())
    expect(optionTexts()).toEqual(['me/vault', 'me/notes', 'friend/campaignshared'])
  })

  it('filters by what is typed and still keeps text that matches nothing', () => {
    render(<Harness />)
    fireEvent.change(input(), { target: { value: 'note' } })
    expect(optionTexts()).toEqual(['me/notes'])

    fireEvent.change(input(), { target: { value: 'https://github.com/someone/public-repo' } })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(input().value).toBe('https://github.com/someone/public-repo')
  })

  it('picks with the arrow keys and Enter, and closes on Escape', () => {
    render(<Harness />)
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(input().value).toBe('me/notes')
    expect(screen.queryByRole('listbox')).toBeNull()

    fireEvent.click(input())
    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('picks with the mouse', () => {
    render(<Harness />)
    fireEvent.click(input())
    fireEvent.mouseDown(screen.getByRole('option', { name: /friend\/campaign/ }))
    expect(input().value).toBe('friend/campaign')
  })
})
