/* The app's service worker. Not bundled: the `serviceWorker` plugin in `vite.config.ts` prepends
 * `PRECACHE` (every file of the build, relative to the app's base) and `VERSION` (a hash over them)
 * and emits the result as `<base>sw.js`.
 *
 * Offline-first for the app itself: every file of a build is cached on install and served from the
 * cache, and every page navigation gets the cached `index.html` (the router takes it from there) —
 * so the app opens without a connection. A new build installs alongside and waits until the page
 * asks it to take over (see `src/pwa/serviceWorker.ts`), so an open tab never mixes two builds'
 * chunks. GitHub's API is cross-origin and passes through untouched: the vault's offline copy lives
 * in IndexedDB (see `src/vault/github/blobCache.ts`).
 */
/* global PRECACHE, VERSION */

const CACHE = `dnd-companion-${VERSION}`
const scope = self.registration.scope
const INDEX = new URL('index.html', scope).href
const precached = new Set(PRECACHE.map((path) => new URL(path, scope).href))

self.addEventListener('install', (event) => {
  event.waitUntil(
    // `reload` skips the HTTP cache, which may still hold the previous build's index.html.
    caches.open(CACHE).then((cache) => cache.addAll([...precached].map((url) => new Request(url, { cache: 'reload' })))),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('dnd-companion-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') void self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // The other HTML pages (Owlbear's) aren't the app's routes — leave them to the network.
    if (/\.html$/i.test(url.pathname) && url.href.split(/[?#]/)[0] !== INDEX) return
    event.respondWith(fromCache(INDEX).then((cached) => cached ?? fetch(request)))
    return
  }
  const key = url.href.split('#')[0]
  if (!precached.has(key)) return
  event.respondWith(fromCache(key).then((cached) => cached ?? fetch(request)))
})

function fromCache(url) {
  return caches.open(CACHE).then((cache) => cache.match(url))
}
