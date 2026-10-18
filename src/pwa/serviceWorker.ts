import { create } from 'zustand'

/** A newer build that installed in the background and waits for the page to let it take over. */
export const useAppUpdate = create<{ waiting: ServiceWorker | null }>(() => ({ waiting: null }))

/**
 * Registers the service worker (`src/pwa/sw.js`) that keeps the app usable offline. Only in a
 * production build — in development it would serve stale modules — and never inside Owlbear Rodeo,
 * whose iframe is a third-party context that needs a connection anyway.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      // Only an update is offered: on the first visit there is no older build to replace.
      const offer = () => {
        if (registration.waiting && navigator.serviceWorker.controller) useAppUpdate.setState({ waiting: registration.waiting })
      }
      offer()
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') offer()
        })
      })
      // An installed app can stay open for days — look for a new build whenever it comes back.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update().catch(() => {})
      })
    } catch (err) {
      console.error('[pwa] registering the service worker failed:', err)
    }
  })
}

/** Switches to the waiting build and reloads. Queued vault edits are kept in IndexedDB meanwhile. */
export function applyAppUpdate() {
  const { waiting } = useAppUpdate.getState()
  if (!waiting) return
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  waiting.postMessage('skip-waiting')
}
