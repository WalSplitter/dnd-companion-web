import { Link, Route, Routes } from 'react-router-dom'
import { ThemeEffect, ThemeSwitcher } from './theme/ThemeSwitcher'
import { VaultLoaderControls } from './vault/VaultLoaderControls'
import { CharacterListPage } from './routes/CharacterListPage'
import { CharacterSheetPage } from './routes/CharacterSheetPage'
import { useVaultStore } from './store/vaultStore'

function App() {
  const isLoading = useVaultStore((s) => s.status === 'loading')
  const loadingProgress = useVaultStore((s) => s.loadingProgress)
  const percent = loadingProgress ? Math.round((loadingProgress.done / loadingProgress.total) * 100) : null

  return (
    <div className="min-h-full">
      <ThemeEffect />
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-lg font-semibold tracking-tight text-fg">
            D&amp;D Companion
          </Link>
          <div className="flex items-center gap-3">
            <VaultLoaderControls />
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

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<CharacterListPage />} />
          <Route path="/characters/:characterName" element={<CharacterSheetPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
