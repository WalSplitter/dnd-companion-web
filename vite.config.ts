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
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
