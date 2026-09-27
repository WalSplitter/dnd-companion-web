import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ColorThemeName = 'light' | 'dark' | 'fluent' | 'purple' | 'orange' | 'red' | 'green' | 'blue'
/** Topic themes go beyond a palette: a backdrop motif, themed panel corners and ambient particles
 * (see `topics.css` and `AmbientLayer`). */
export type TopicThemeName = 'necromancer' | 'shadowmaster' | 'unicorn' | 'halloween' | 'christmas' | 'summer' | 'spring'
export type ThemeName = ColorThemeName | TopicThemeName

export interface ThemeEntry<K extends ThemeName = ThemeName> {
  key: K
  label: string
  swatch: string
  swatchBorder?: string
}

export const THEMES: ThemeEntry<ColorThemeName>[] = [
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

/** Shown as icons (tinted with `swatch`) in the switcher's second row. */
export const TOPIC_THEMES: ThemeEntry<TopicThemeName>[] = [
  { key: 'necromancer', label: 'Necromancer', swatch: '#8fdc5a' },
  { key: 'shadowmaster', label: 'Shadow Master', swatch: '#8b7cf6' },
  { key: 'unicorn', label: 'Unicorn', swatch: '#e879f9' },
  { key: 'halloween', label: 'Halloween', swatch: '#f97316' },
  { key: 'christmas', label: 'Christmas', swatch: '#dc2626' },
  { key: 'summer', label: 'Summer', swatch: '#facc15' },
  { key: 'spring', label: 'Spring', swatch: '#f472b6' },
]

export function isTopicTheme(theme: ThemeName): theme is TopicThemeName {
  return TOPIC_THEMES.some((t) => t.key === theme)
}

interface ThemeState {
  theme: ThemeName
  /** Ambient particles of topic themes; off keeps the static look (motif, corners). */
  effects: boolean
  setTheme: (theme: ThemeName) => void
  setEffects: (effects: boolean) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      effects: true,
      setTheme: (theme) => set({ theme }),
      setEffects: (effects) => set({ effects }),
    }),
    { name: 'dnd-companion-theme' },
  ),
)
