import type { ImageAssets } from '../vault/types'

const images = import.meta.glob('./**/*.{svg,png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

/** Portrait attachments, keyed like `vaultLoader`'s assets (lower-case bare filename). These are
 * bundled asset URLs, not object URLs, so they must never be revoked. Kept apart from the notes
 * (`index.ts`) so the start page can show the party without pulling the whole vault into its bundle. */
export const sampleVaultImages: ImageAssets = new Map(
  Object.entries(images).map(([path, url]) => [path.replace(/^\.\//, '').split('/').pop()!.toLowerCase(), url]),
)
