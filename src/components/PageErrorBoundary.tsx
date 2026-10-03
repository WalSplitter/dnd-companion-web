import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useT } from '../i18n/useI18n'
import { reportError } from '../store/errorLogStore'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

/**
 * Catches a render error in the page area (an unexpected shape in a hand-written vault note, a lazy
 * page chunk gone after a deploy) so it replaces only the page, not the whole app: header, navigation
 * and the error log keep working. The error goes to the error log like any other. Give it a `key` per
 * route so moving to another page starts fresh.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportError({
      titleKey: 'errorLog.renderFailed',
      source: 'render',
      error,
      context: { componentStack: info.componentStack?.trim() },
    })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <PageErrorFallback onRetry={() => this.setState({ failed: false })} />
  }
}

function PageErrorFallback({ onRetry }: { onRetry: () => void }) {
  const t = useT()
  return (
    <div role="alert" className="rpg-panel mx-auto mt-6 flex max-w-lg flex-col items-center gap-3 p-6 text-center">
      <span aria-hidden className="text-4xl text-danger">
        ⚠
      </span>
      <h1 className="font-display text-xl font-bold text-fg">{t('errorBoundary.title')}</h1>
      <p className="text-sm text-fg-muted">{t('errorBoundary.hint')}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onRetry} className="cursor-pointer rounded-md border border-trim/40 px-3 py-1.5 text-sm text-fg hover:bg-trim/10">
          {t('errorLog.retry')}
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="cursor-pointer rounded-md border border-trim/40 px-3 py-1.5 text-sm text-fg hover:bg-trim/10"
        >
          {t('errorBoundary.reload')}
        </button>
      </div>
    </div>
  )
}
