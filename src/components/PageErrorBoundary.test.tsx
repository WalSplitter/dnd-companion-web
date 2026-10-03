import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n/I18nContext'
import { useErrorLogStore } from '../store/errorLogStore'
import { PageErrorBoundary } from './PageErrorBoundary'

let broken = true

function Page() {
  if (broken) throw new Error('bad note')
  return <p>page content</p>
}

function renderPage() {
  return render(
    <I18nProvider>
      <PageErrorBoundary>
        <Page />
      </PageErrorBoundary>
    </I18nProvider>,
  )
}

describe('PageErrorBoundary', () => {
  beforeEach(() => {
    broken = true
    useErrorLogStore.getState().clear()
    // React logs every caught render error to the console; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('replaces a page that throws while rendering and reports the error to the log', () => {
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    const [entry] = useErrorLogStore.getState().entries
    expect(entry).toMatchObject({ titleKey: 'errorLog.renderFailed', source: 'render', message: 'bad note' })
  })

  it('renders the page again on retry once it no longer throws', () => {
    renderPage()
    broken = false
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByText('page content')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
