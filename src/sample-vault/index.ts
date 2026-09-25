import type { VaultSourceFile } from '../vault/types'
import type { ImageAssets } from '../vault/vaultLoader'

const notes = import.meta.glob('./**/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
const images = import.meta.glob('./**/*.{svg,png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const vaultPath = (path: string) => path.replace(/^\.\//, '')

/**
 * The bundled demo vault — a small, self-contained replica of an Endeavour player vault
 * (`Kampagne/Gruppe/<Name>/…`, `Gegenstände/…`, `Regeln/…`). Notes ship as source text via Vite's
 * `?raw` import so the app works offline with no folder picker.
 */
export const sampleVaultFiles: VaultSourceFile[] = Object.entries(notes).map(([path, content]) => ({ path: vaultPath(path), content }))

/** Portrait attachments, keyed like `vaultLoader`'s assets (lower-case bare filename). These are
 * bundled asset URLs, not object URLs, so they must never be revoked. */
export const sampleVaultImages: ImageAssets = new Map(
  Object.entries(images).map(([path, url]) => [vaultPath(path).split('/').pop()!.toLowerCase(), url]),
)
