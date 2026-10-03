import type { VaultSourceFile } from '../vault/types'

export { sampleVaultImages } from './images'

const notes = import.meta.glob('./**/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

/**
 * The bundled demo vault — a small, self-contained replica of an Endeavour player vault
 * (`Kampagne/Gruppe/<Name>/…`, `Gegenstände/…`, `Regeln/…`). Notes ship as source text via Vite's
 * `?raw` import so the app works offline with no folder picker. The store imports this module
 * dynamically, so its notes only download once someone opens the sample vault.
 */
export const sampleVaultFiles: VaultSourceFile[] = Object.entries(notes).map(([path, content]) => ({ path: path.replace(/^\.\//, ''), content }))
