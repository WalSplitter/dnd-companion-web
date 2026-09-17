import type { VaultSourceFile } from '../vault/types'

/**
 * TEMPORARY, dev-only. Reads the DM's real "Endeavour" campaign vault straight off disk at
 * dev-server/build time, via a hardcoded relative path, so "Load dummy vault (dev)"
 * (`VaultLoaderControls.tsx`) can show real rules/content alongside the bundled dummy character
 * (see `index.ts`, merged there). Strictly read-only — nothing here, or anywhere in this app, ever
 * writes back to this folder.
 *
 * Two things to know before touching this:
 *  - The path is hardcoded and machine-specific: `E:\Git\Endeavour_PlayerVault\Endeavour_PlayerVault`,
 *    expressed here relative to this file. On any other machine/checkout the glob simply matches
 *    nothing (empty array), so this degrades safely rather than erroring — but it also means this
 *    file is not portable and shouldn't be treated as part of the app's real feature set.
 *  - `import.meta.glob(..., { eager: true })` bakes a snapshot of that vault's *text* into whatever
 *    consumes this module. That's fine for `npm run dev` on this machine, but never run
 *    `npm run build` for an actual deployment while this is wired in — it would ship the DM's
 *    private vault content in the output. Delete this file (and its use in `index.ts`) first, once
 *    the DM has real character/item sheets to develop against instead.
 *
 * `vite.config.ts`'s `server.fs.allow` also had to be widened to permit this — see its comment.
 */
const modules = import.meta.glob('../../../Endeavour_PlayerVault/Endeavour_PlayerVault/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const PATH_PREFIX_RE = /^.*Endeavour_PlayerVault\/Endeavour_PlayerVault\//

export const endeavourRealVaultFiles: VaultSourceFile[] = Object.entries(modules).map(([path, content]) => ({
  // Re-rooted to a vault-relative path (matching what a real folder-picker load would produce)
  // rather than the long resolved specifier `import.meta.glob` gives back.
  path: path.replace(PATH_PREFIX_RE, ''),
  content,
}))
