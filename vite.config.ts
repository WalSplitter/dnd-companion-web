import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages serves the app under /<repo>/; the deploy workflow sets BASE_PATH, local builds stay at /
  base: process.env.BASE_PATH ?? '/',
  build: {
    rollupOptions: {
      output: {
        // Third-party code changes rarely, so keep it in its own cacheable chunk
        manualChunks(id) {
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
