import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeName = 'light' | 'dark' | 'fluent' | 'purple' | 'orange' | 'red' | 'green' | 'blue'

export const THEMES: { key: ThemeName; label: string; swatch: string; swatchBorder?: string }[] = [
  // Light/dark swatches represent the theme itself (a white or black dot), not its accent color —
  // the other themes keep their accent color since that's already a distinctive enough swatch.
  { key: 'light', label: 'Light', swatch: '#ffffff', swatchBorder: '#000000' },
  { key: 'dark', label: 'Dark', swatch: '#000000', swatchBorder: '#ffffff' },
  { key: 'fluent', label: 'Fluent', swatch: '#38bdf8' },
  { key: 'purple', label: 'Purple', swatch: '#a855f7' },
  { key: 'orange', label: 'Orange', swatch: '#f97316' },
  { key: 'red', label: 'Red', swatch: '#ef4444' },
  { key: 'green', label: 'Green', swatch: '#22c55e' },
  { key: 'blue', label: 'Blue', swatch: '#3b82f6' },
]

interface ThemeState {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'dnd-companion-theme' },
  ),
)
