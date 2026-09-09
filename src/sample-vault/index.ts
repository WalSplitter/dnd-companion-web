import type { VaultSourceFile } from '../vault/types'

const modules = import.meta.glob('./**/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<
  string,
  string
>

/** The bundled demo vault, shipped as source text via Vite's `?raw` import so it works offline with no folder picker. */
export const sampleVaultFiles: VaultSourceFile[] = Object.entries(modules).map(([path, content]) => ({
  path: path.replace(/^\.\//, ''),
  content,
}))
