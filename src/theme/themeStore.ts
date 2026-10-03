import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ColorThemeName = 'light' | 'dark' | 'parchment' | 'fluent' | 'purple' | 'orange' | 'red' | 'green' | 'blue'
/** One theme per Endeavour class (see `classes.css`). */
export type ClassThemeName =
  | 'arkanist'
  | 'berserker'
  | 'fluchwirker'
  | 'gauner'
  | 'kleriker'
  | 'moench'
  | 'naturalist'
  | 'paladin'
  | 'taktiker'
  | 'waldlaeufer'
export type WorldThemeName = 'pixelquest' | 'dragon' | 'unicorn'
export type SeasonThemeName = 'halloween' | 'christmas' | 'summer' | 'spring'
/** Topic themes go beyond a palette: a backdrop motif, themed panel corners and ambient particles
 * (see `classes.css`, `topics.css` and `AmbientLayer`). */
export type TopicThemeName = ClassThemeName | WorldThemeName | SeasonThemeName
export type ThemeName = ColorThemeName | TopicThemeName

export interface ThemeEntry<K extends ThemeName = ThemeName> {
  key: K
  swatch: string
  swatchBorder?: string
}

export const THEMES: ThemeEntry<ColorThemeName>[] = [
  // Light/dark swatches represent the theme itself (a white or black dot), not its accent color —
  // the other themes keep their accent color since that's already a distinctive enough swatch.
  { key: 'light', swatch: '#ffffff', swatchBorder: '#000000' },
  { key: 'dark', swatch: '#000000', swatchBorder: '#ffffff' },
  { key: 'parchment', swatch: '#e9d8b0', swatchBorder: '#8a6224' },
  { key: 'fluent', swatch: '#38bdf8' },
  { key: 'purple', swatch: '#a855f7' },
  { key: 'orange', swatch: '#f97316' },
  { key: 'red', swatch: '#ef4444' },
  { key: 'green', swatch: '#22c55e' },
  { key: 'blue', swatch: '#3b82f6' },
]

export const CLASS_THEMES: ThemeEntry<ClassThemeName>[] = [
  { key: 'arkanist', swatch: '#7cc4ff' },
  { key: 'berserker', swatch: '#e2412b' },
  { key: 'fluchwirker', swatch: '#9be564' },
  { key: 'gauner', swatch: '#7f9fd0' },
  { key: 'kleriker', swatch: '#c9c6bd' },
  { key: 'moench', swatch: '#e8952a' },
  { key: 'naturalist', swatch: '#7fd36a' },
  { key: 'paladin', swatch: '#f2c84b' },
  { key: 'taktiker', swatch: '#c43c3c' },
  { key: 'waldlaeufer', swatch: '#9bbf4a' },
]

export const WORLD_THEMES: ThemeEntry<WorldThemeName>[] = [
  { key: 'pixelquest', swatch: '#e8742a' },
  { key: 'dragon', swatch: '#f25c1f' },
  { key: 'unicorn', swatch: '#e879f9' },
]

export const SEASON_THEMES: ThemeEntry<SeasonThemeName>[] = [
  { key: 'halloween', swatch: '#f97316' },
  { key: 'christmas', swatch: '#dc2626' },
  { key: 'summer', swatch: '#facc15' },
  { key: 'spring', swatch: '#f472b6' },
]

export const TOPIC_THEMES: ThemeEntry<TopicThemeName>[] = [...CLASS_THEMES, ...WORLD_THEMES, ...SEASON_THEMES]

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
    {
      name: 'dnd-companion-theme',
      version: 2,
      // v1 replaced the Shadow Master theme with Pixel Quest; v2 folded Necromancer into the
      // Fluchwirker class theme.
      migrate: (persisted, version) => {
        const state = persisted as ThemeState
        if (version < 1 && (state.theme as string) === 'shadowmaster') state.theme = 'pixelquest'
        if (version < 2 && (state.theme as string) === 'necromancer') state.theme = 'fluchwirker'
        return state
      },
    },
  ),
)
