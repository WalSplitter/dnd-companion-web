import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppFooter } from './components/AppFooter'
import { ErrorToaster } from './components/ErrorToaster'
import { TooltipLayer } from './components/TooltipLayer'
import { useT } from './i18n/useI18n'
import { LanguageSwitcher } from './i18n/LanguageSwitcher'
import { AmbientLayer } from './theme/AmbientLayer'
import { ThemeEffect, ThemeSwitcher } from './theme/ThemeSwitcher'
import { VaultLoaderControls } from './vault/VaultLoaderControls'
import { CharacterListPage, CharacterSheetPage } from './routes/lazyPages'
import { StartPage } from './routes/StartPage'
import { VaultLayout } from './routes/VaultLayout'
import { useVaultStore } from './store/vaultStore'

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
    // The start page is a single screen: the shell is exactly viewport-tall, header and footer stay
    // put, and only the content between them scrolls when it doesn't fit (phones, small windows) —
    // by touch or wheel, without a visible scrollbar.
    // Vault pages scroll as a whole, so the footer doesn't take room from long character sheets.
    <div className={onStartPage ? 'flex h-dvh flex-col' : 'flex min-h-full flex-col'}>
      <ThemeEffect />
      <AmbientLayer />
      <ErrorToaster />
      <TooltipLayer />
      {/* Frosted only from `sm` up: blurring the content scrolling beneath costs every frame on phones. */}
      <header className="sticky top-0 z-10 border-b border-trim/20 bg-surface/95 shadow-[0_1px_0_color-mix(in_srgb,var(--color-trim)_18%,transparent)] sm:bg-surface/90 sm:backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
          <Link
            to="/"
            className="shrink-0 font-display text-xl font-bold tracking-wide text-fg [text-shadow:0_0_16px_color-mix(in_srgb,var(--color-trim)_35%,transparent)]"
          >
            <span className="sm:hidden">{t('app.brandShort')}</span>
            <span className="hidden sm:inline">{t('app.brand')}</span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center justify-end gap-2.5">
            {showVaultControls && (
              <>
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

      <div data-start-scroll={onStartPage || undefined} className={onStartPage ? 'no-scrollbar start-scroll flex min-h-0 flex-1 flex-col overflow-y-auto' : 'flex flex-1 flex-col'}>
        <main className={`mx-auto w-full max-w-6xl flex-1 px-4 pb-4 ${onStartPage ? 'flex flex-col pt-6 short:pt-3' : 'pt-6'}`}>
          <Routes>
            <Route path="/" element={<StartPage />} />
            <Route element={<VaultLayout />}>
              <Route path="/characters" element={<CharacterListPage />} />
              <Route path="/characters/:characterName" element={<CharacterSheetPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <AppFooter />
    </div>
  )
}

export default App
