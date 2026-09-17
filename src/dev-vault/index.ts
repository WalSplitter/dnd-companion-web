import type { VaultSourceFile } from '../vault/types'
import { endeavourRealVaultFiles } from './endeavourRealVault'

/**
 * TEMPORARY scaffolding: the real "Endeavour" campaign vault (see `docs/inventory-vault-alignment.md`)
 * has no character sheets yet, only rules and a few DM-private embed templates. This bundles a
 * dummy character + mock items (below, this directory) *together with* the real vault's actual
 * files (`endeavourRealVault.ts`, read live off disk — read-only, never written to) so inventory UI
 * work can proceed against real rules/content plus a character that actually has something in its
 * inventory. The mock items deliberately use the experimental "Endeavour" tag scheme
 * (`Gegenstand/Waffe/...`, see `src/vault/adapters/endeavourItem.ts`) rather than this app's own
 * native `type: item` schema, matching the shape inferred from the real vault. Delete this whole
 * directory (and its wiring in `vaultStore.ts` / `VaultLoaderControls.tsx` / `vite.config.ts`) once
 * the DM ships real character/item sheets.
 */
const modules = import.meta.glob('./**/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<
  string,
  string
>

const dummyFiles: VaultSourceFile[] = Object.entries(modules).map(([path, content]) => ({
  path: path.replace(/^\.\//, ''),
  content,
}))

export const devVaultFiles: VaultSourceFile[] = [...endeavourRealVaultFiles, ...dummyFiles]
