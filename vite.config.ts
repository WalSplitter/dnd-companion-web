import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      // TEMPORARY, dev-only: lets the dev server serve `src/dev-vault/endeavourRealVault.ts`'s
      // `import.meta.glob` read of the real "Endeavour" campaign vault, which lives outside this
      // project. Machine-specific hardcoded path — remove once that scaffolding is deleted (see its
      // own doc comment for why).
      allow: ['.', 'E:/Git/Endeavour_PlayerVault'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
