import { Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { VaultLoadingScreen } from '../components/VaultLoadingScreen'
import { VaultNav } from '../components/VaultNav'
import { useVaultStore, wasSampleVaultActive } from '../store/vaultStore'

/**
 * Shell of every page that shows vault content. Opened straight from a link or a reload (nothing
 * loaded yet), it reopens the sample vault if this tab was showing it, else quietly reopens the last
 * vault if the browser still grants access, and otherwise sends the visitor to the start page —
 * never showing another vault in the meantime.
 */
export function VaultLayout() {
  const location = useLocation()
  const source = useVaultStore((s) => s.source)
  const status = useVaultStore((s) => s.status)
  const [restoring, setRestoring] = useState(() => useVaultStore.getState().source === 'none')

  useEffect(() => {
    if (useVaultStore.getState().source !== 'none') return
    if (wasSampleVaultActive()) {
      useVaultStore.getState().loadSampleVault()
      setRestoring(false)
      return
    }
    let active = true
    void (async () => {
      const store = useVaultStore.getState()
      await store.refreshRecents()
      const last = useVaultStore.getState().recents[0]
      if (last) await store.openRecentVault(last.id, { silent: true })
      if (active) setRestoring(false)
    })()
    return () => {
      active = false
    }
  }, [])

  if (source === 'none') {
    if (restoring || status === 'loading') return <VaultLoadingScreen />
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return (
    <>
      <VaultNav />
      <div key={location.pathname} className="page-enter">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>
    </>
  )
}
