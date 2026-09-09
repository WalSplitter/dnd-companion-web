import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeName = 'light' | 'dark' | 'fluent' | 'purple' | 'orange'

export const THEMES: { key: ThemeName; label: string; swatch: string }[] = [
  { key: 'light', label: 'Light', swatch: '#4f46e5' },
  { key: 'dark', label: 'Dark', swatch: '#818cf8' },
  { key: 'fluent', label: 'Fluent', swatch: '#2564cf' },
  { key: 'purple', label: 'Purple', swatch: '#a855f7' },
  { key: 'orange', label: 'Orange', swatch: '#f97316' },
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
