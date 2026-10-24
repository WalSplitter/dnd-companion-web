import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n/I18nContext'
import { Onboarding } from './Onboarding'
import { reportQuestAction } from './questEvents'
import { useQuestStore } from './questStore'

function renderAt(path: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <Onboarding />
      </MemoryRouter>
    </I18nProvider>,
  )
}

describe('Onboarding', () => {
  beforeEach(() => {
    useQuestStore.setState({ ...useQuestStore.getInitialState() })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }))
  })

  it('welcomes a first-time visitor and remembers the answer', () => {
    renderAt('/')
    const dialog = screen.getByRole('dialog', { name: /welcome|willkommen/i })
    fireEvent.click(dialog.querySelectorAll('button')[2])
    expect(useQuestStore.getState().experience).toBe('veteran')
    expect(screen.queryByRole('dialog', { name: /welcome|willkommen/i })).not.toBeInTheDocument()
  })

  it('starts the prologue for a newcomer on the start page, with Splitter speaking', () => {
    renderAt('/')
    fireEvent.click(screen.getByRole('dialog', { name: /welcome|willkommen/i }).querySelectorAll('button')[0])
    expect(useQuestStore.getState().active).toEqual({ questId: 'welcome', step: 0 })
    expect(useQuestStore.getState().learnMode).toBe(true)
  })

  it('completes a quest by doing its goal, even without the tour running', () => {
    useQuestStore.setState({ experience: 'player' })
    renderAt('/characters')
    act(() => reportQuestAction('roll'))
    expect(useQuestStore.getState().completed).toContain('sheet-roll')
    expect(useQuestStore.getState().notice).toMatchObject({ kind: 'complete', questId: 'sheet-roll' })
  })

  it('moves a waiting step on when its action happens', () => {
    useQuestStore.setState({ experience: 'player', active: { questId: 'sheet-advantage', step: 1 } })
    renderAt('/characters/Elandra')
    act(() => reportQuestAction('roll-mode'))
    expect(useQuestStore.getState().active).toBeNull()
    expect(useQuestStore.getState().completed).toContain('sheet-advantage')
  })

  it('shows nothing at all once the mentor is turned off', () => {
    useQuestStore.setState({ enabled: false })
    const { container } = renderAt('/')
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
