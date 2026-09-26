import { lazy } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppFooter } from './components/AppFooter'
import { ErrorToaster } from './components/ErrorToaster'
import { TooltipLayer } from './components/TooltipLayer'
import { useT } from './i18n/useI18n'
import { LanguageSwitcher } from './i18n/LanguageSwitcher'
import { ThemeEffect, ThemeSwitcher } from './theme/ThemeSwitcher'
import { RulesetBadge } from './vault/RulesetBadge'
import { VaultLoaderControls } from './vault/VaultLoaderControls'
import { CharacterListPage } from './routes/CharacterListPage'
import { StartPage } from './routes/StartPage'
import { VaultLayout } from './routes/VaultLayout'
import { useVaultStore } from './store/vaultStore'

// The sheet (with inventory, spells, markdown rendering) is the heavy part — load it on first visit only.
const CharacterSheetPage = lazy(() => import('./routes/CharacterSheetPage').then((m) => ({ default: m.CharacterSheetPage })))

function App() {
  const t = useT()
  const isLoading = useVaultStore((s) => s.status === 'loading')
  const loadingProgress = useVaultStore((s) => s.loadingProgress)
  // The start page brings its own vault controls; the header's only matter once a vault is open.
  const vaultOpen = useVaultStore((s) => s.source !== 'none')
  const onStartPage = useLocation().pathname === '/'
  const showVaultControls = vaultOpen && !onStartPage
  const percent = loadingProgress && loadingProgress.total > 0 ? Math.round((loadingProgress.done / loadingProgress.total) * 100) : null

  return (
    <div className="flex min-h-full flex-col">
      <ThemeEffect />
      <ErrorToaster />
      <TooltipLayer />
      <header className="sticky top-0 z-10 border-b border-trim/20 bg-surface/90 shadow-[0_1px_0_color-mix(in_srgb,var(--color-trim)_18%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 overflow-x-auto px-4 py-3">
          <Link
            to="/"
            className="shrink-0 font-display text-xl font-bold tracking-wide text-fg [text-shadow:0_0_16px_color-mix(in_srgb,var(--color-trim)_35%,transparent)]"
          >
            {t('app.brand')}
          </Link>
          <div className="flex shrink-0 items-center justify-end gap-2.5">
            {showVaultControls && (
              <>
                <RulesetBadge />
                <VaultLoaderControls />
                <div className="mx-0.5 h-6 w-px bg-trim/20" aria-hidden />
              </>
            )}
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
        {isLoading && (
          <div className="h-1 w-full overflow-hidden bg-surface-2">
            <div
              className={`h-full bg-primary ${percent === null ? 'w-1/3 animate-pulse' : 'transition-[width] duration-200'}`}
              style={percent !== null ? { width: `${percent}%` } : undefined}
            />
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-4 pt-6">
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route element={<VaultLayout />}>
            <Route path="/characters" element={<CharacterListPage />} />
            <Route path="/characters/:characterName" element={<CharacterSheetPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <AppFooter />
    </div>
  )
}

export default App
