import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import pkg from './package.json' with { type: 'json' }
import { ringFiles } from './src/owlbear/rings.ts'

const OWLBEAR_MANIFEST = 'owlbear-manifest.json'

/**
 * The manifest that adds the app to Owlbear Rodeo as an extension (Owlbear: Extensions → Add custom
 * extension → `<app url>/owlbear-manifest.json`). Generated rather than kept in `public/`, so its
 * paths carry the base the app is served under — locally `/`, on GitHub Pages `/<repo>/`.
 */
function owlbearManifest(): Plugin {
  let base = '/'
  const source = () =>
    JSON.stringify(
      {
        name: 'D&D Companion',
        version: pkg.version,
        manifest_version: 1,
        author: 'WalSplitter',
        description: 'Your character sheets from your Obsidian vault, right next to the map.',
        icon: `${base}favicon.svg`,
        action: {
          title: 'D&D Companion',
          // Owlbear's toolbar wants a light, single-colour glyph on a transparent background.
          icon: `${base}owlbear-icon.svg`,
          // Only the remote for the companion, which opens as a popover of its own (see `src/owlbear/panel.ts`).
          popover: `${base}owlbear-action.html`,
          width: 240,
          height: 150,
        },
        // Runs unseen for everyone in the room, also while the companion is closed: keeps combat
        // trackers such as Clash and the companion's live values in step (see `src/owlbear/background.ts`).
        background_url: `${base}owlbear-background.html`,
      },
      null,
      2,
    )
  return {
    name: 'owlbear-manifest',
    configResolved(config) {
      base = config.base
    },
    configureServer(server) {
      server.middlewares.use(`${base}${OWLBEAR_MANIFEST}`, (_req, res) => {
        // Owlbear fetches the manifest from its own origin.
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Content-Type', 'application/json')
        res.end(source())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: OWLBEAR_MANIFEST, source: source() })
    },
  }
}

const RINGS_DIR = 'owlbear-rings'

/**
 * The condition rings drawn on tokens in Owlbear Rodeo (see `src/owlbear/rings.ts`), generated from
 * the same list the app uses rather than kept as files — served under `<base>owlbear-rings/`.
 */
function owlbearRings(): Plugin {
  let base = '/'
  return {
    name: 'owlbear-rings',
    configResolved(config) {
      base = config.base
    },
    configureServer(server) {
      const files = ringFiles()
      server.middlewares.use(`${base}${RINGS_DIR}/`, (req, res, next) => {
        const svg = files[decodeURIComponent((req.url ?? '').replace(/^\//, '').split('?')[0])]
        if (!svg) return next()
        // Owlbear draws them with WebGL, which needs CORS.
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Content-Type', 'image/svg+xml')
        res.end(svg)
      })
    },
    generateBundle() {
      for (const [file, svg] of Object.entries(ringFiles())) this.emitFile({ type: 'asset', fileName: `${RINGS_DIR}/${file}`, source: svg })
    },
  }
}

/**
 * The app's service worker (`src/pwa/sw.js`), emitted as `<base>sw.js` with the list of files to
 * cache for offline use: everything the build produced plus `public/` — minus what only Owlbear
 * Rodeo loads (it needs a connection anyway) — and a version hash over their contents, so every
 * build that changes a file installs as a new worker.
 */
function serviceWorker(): Plugin {
  let publicDir = ''
  const publicFiles = (): [string, Buffer][] =>
    publicDir
      ? readdirSync(publicDir, { recursive: true, encoding: 'utf8' })
          .filter((file) => statSync(join(publicDir, file)).isFile())
          .map((file) => [relative(publicDir, join(publicDir, file)).replace(/\\/g, '/'), readFileSync(join(publicDir, file))])
      : []
  return {
    name: 'service-worker',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir
    },
    generateBundle: {
      // After the other plugins emitted their files, so the list is complete.
      order: 'post',
      handler(_options, bundle) {
        const files = new Map<string, string | Uint8Array>(publicFiles())
        for (const [name, item] of Object.entries(bundle)) files.set(name, item.type === 'chunk' ? item.code : item.source)
        const precache = [...files.keys()].filter((name) => !/(^|\/)owlbear|\.map$|(^|\/)desktop\.ini$/i.test(name)).sort()
        const hash = createHash('sha256')
        for (const name of precache) hash.update(name).update('\0').update(files.get(name)!)
        const source = readFileSync(new URL('./src/pwa/sw.js', import.meta.url), 'utf8')
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `const PRECACHE = ${JSON.stringify(precache)}
const VERSION = '${hash.digest('hex').slice(0, 12)}'
${source}`,
        })
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), owlbearManifest(), owlbearRings(), serviceWorker()],
  // GitHub Pages serves the app under /<repo>/; the deploy workflow sets BASE_PATH, local builds stay at /
  base: process.env.BASE_PATH ?? '/',
  server: {
    // Owlbear Rodeo loads the toolbar icon as a CSS mask, which needs CORS — Vite only allows
    // localhost origins by default. (GitHub Pages allows every origin.)
    cors: { origin: [/^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/, 'https://www.owlbear.rodeo'] },
  },
  build: {
    rollupOptions: {
      // The app, and Owlbear Rodeo's pages: the toolbar button's popover, the minimized companion's
      // button and the background page
      input: ['index.html', 'owlbear-action.html', 'owlbear-mini.html', 'owlbear-background.html'],
      output: {
        // Third-party code changes rarely, so keep it in its own cacheable chunk
        manualChunks(id) {
          // Only loaded inside Owlbear Rodeo, so the SDK and its dependencies stay out of the chunk every
          // visitor downloads — and out of the toolbar button's small page, which needs nothing else
          if (/node_modules\/(@owlbear-rodeo|events|immer|js-base64|uuid)\//.test(id)) return 'owlbear'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Logic tests (.ts) run in plain Node; only component tests (.tsx) pay for a jsdom environment,
    // which cost over 80% of the run time when every file got one. A .ts test that needs browser
    // APIs opts in with a `// @vitest-environment jsdom` comment.
    projects: [
      { extends: true, test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] } },
      { extends: true, test: { name: 'dom', environment: 'jsdom', include: ['src/**/*.test.tsx'] } },
    ],
  },
})
