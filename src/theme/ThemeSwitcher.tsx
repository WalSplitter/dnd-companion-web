import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useT, type TranslationKey } from '../i18n/useI18n'
import {
  CLASS_THEMES,
  isTopicTheme,
  themeTone,
  SEASON_THEMES,
  THEMES,
  TOPIC_THEMES,
  useThemeStore,
  WORLD_THEMES,
  type ThemeEntry,
  type ThemeName,
  type TopicThemeName,
} from './themeStore'
import {
  AxeIcon,
  BannerIcon,
  BlossomIcon,
  BowIcon,
  CastleIcon,
  DaggerIcon,
  DragonIcon,
  EnsoIcon,
  FirTreeIcon,
  HornIcon,
  OrbIcon,
  PlanetIcon,
  PumpkinIcon,
  ScalesIcon,
  ShellIcon,
  ShieldCrossIcon,
  SkullIcon,
  SnowflakeIcon,
  SparklesIcon,
  StormLeafIcon,
  SunIcon,
  type IconProps,
} from './topicIcons'

const TOPIC_ICONS: Record<TopicThemeName, ComponentType<IconProps>> = {
  arkanist: OrbIcon,
  berserker: AxeIcon,
  fluchwirker: SkullIcon,
  gauner: DaggerIcon,
  kleriker: ScalesIcon,
  moench: EnsoIcon,
  naturalist: StormLeafIcon,
  paladin: ShieldCrossIcon,
  taktiker: BannerIcon,
  waldlaeufer: BowIcon,
  pixelquest: CastleIcon,
  dragon: DragonIcon,
  unicorn: HornIcon,
  deepsea: ShellIcon,
  astral: PlanetIcon,
  halloween: PumpkinIcon,
  christmas: FirTreeIcon,
  summer: SunIcon,
  spring: BlossomIcon,
  winter: SnowflakeIcon,
}

const TOPIC_GROUPS: { title: TranslationKey; themes: ThemeEntry<TopicThemeName>[] }[] = [
  { title: 'theme.group.class', themes: CLASS_THEMES },
  { title: 'theme.group.world', themes: WORLD_THEMES },
  { title: 'theme.group.season', themes: SEASON_THEMES },
]

/** A topic theme's backdrop in miniature: its own bg with a glow of its primary colour rising. */
const PREVIEW_STYLE: CSSProperties = {
  backgroundImage:
    'radial-gradient(ellipse 90% 70% at 50% 120%, color-mix(in srgb, var(--color-primary) 35%, transparent), transparent 70%)',
}

/** Mounted once near the app root: syncs the persisted theme onto `<html data-theme>`, plus
 * `data-theme-kind="topic"` for topic themes (their extra chrome in `topics.css` keys off it). */
export function ThemeEffect() {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.setAttribute('data-theme-kind', isTopicTheme(theme) ? 'topic' : 'color')
    root.setAttribute('data-theme-tone', themeTone(theme))
  }, [theme])

  return null
}

/** A colour theme's dot, or a topic theme's icon — both in the theme's own swatch colour. */
function ThemeSwatch({ entry }: { entry: ThemeEntry }) {
  if (isTopicTheme(entry.key)) {
    const Icon = TOPIC_ICONS[entry.key]
    return (
      <span style={{ color: entry.swatch }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
    )
  }
  return (
    <span
      className="h-4 w-4 rounded-full"
      style={{ backgroundColor: entry.swatch, border: entry.swatchBorder ? `1px solid ${entry.swatchBorder}` : undefined }}
    />
  )
}

interface ThemeCardProps {
  entry: ThemeEntry<TopicThemeName>
  active: boolean
  label: string
  compact: boolean
  onSelect: () => void
}

/** A topic theme as a small card: a live preview (the theme's own tokens through a nested
 * `data-theme`) with its icon and a primary/accent/trim stripe, its name below (hyphenated onto a
 * second line when the card is narrow). */
function ThemeCard({ entry, active, label, compact, onSelect }: ThemeCardProps) {
  const Icon = TOPIC_ICONS[entry.key]
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onSelect}
      title={label}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-lg p-1 transition ${
        active ? 'bg-trim/15 ring-2 ring-trim' : 'hover:bg-trim/10'
      }`}
    >
      <span
        data-theme={entry.key}
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-md border border-border bg-bg ${
          compact ? 'h-9' : 'h-11'
        }`}
        style={PREVIEW_STYLE}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-trim/50">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden>
          <span className="flex-1 bg-primary" />
          <span className="flex-1 bg-accent" />
          <span className="flex-1 bg-trim" />
        </span>
      </span>
      <span
        className={`line-clamp-2 w-full hyphens-auto text-center text-[10px] leading-tight [overflow-wrap:anywhere] ${
          active ? 'text-fg' : 'text-fg-muted'
        }`}
      >
        {label}
      </span>
    </button>
  )
}

function GroupTitle({ children }: { children: string }) {
  return <div className="px-1 font-display text-[10px] font-bold uppercase tracking-widest text-trim">{children}</div>
}

/** `popover` hangs below the trigger; `wide` is the same popover laid out in fewer, longer rows for
 * windows too low for it (landscape phones, small laptop windows); `sheet` slides up from the
 * bottom edge on phones in portrait. */
type PanelMode = 'popover' | 'wide' | 'sheet'

interface PanelLayout {
  mode: PanelMode
  top: number
  right: number
}

/** Below this width the panel becomes a bottom sheet. */
const SHEET_MAX_WIDTH = 640
/** Room the popover layout needs below the trigger; with less it switches to the wide layout. */
const POPOVER_MIN_HEIGHT = 540
const EDGE_GAP = 16

function measureLayout(trigger: HTMLElement): PanelLayout {
  const rect = trigger.getBoundingClientRect()
  const top = rect.bottom + 6
  const right = window.innerWidth - rect.right
  if (window.innerWidth < SHEET_MAX_WIDTH) return { mode: 'sheet', top, right }
  const room = window.innerHeight - top - EDGE_GAP
  return { mode: room < POPOVER_MIN_HEIGHT ? 'wide' : 'popover', top, right }
}

/** Collapsed to a single swatch button showing the active theme — clicking it opens a panel with
 * the basic colour themes as a row of dots, the class, world and season themes as preview cards,
 * and the effects toggle at the bottom. */
export function ThemeSwitcher() {
  const translate = useT()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const effects = useThemeStore((s) => s.effects)
  const setEffects = useThemeStore((s) => s.setEffects)
  const [open, setOpen] = useState(false)
  const [layout, setLayout] = useState<PanelLayout>({ mode: 'popover', top: 0, right: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const active: ThemeEntry = [...THEMES, ...TOPIC_THEMES].find((t) => t.key === theme) ?? THEMES[0]
  const labelOf = (key: ThemeName) => translate(`theme.${key}` as TranslationKey)

  useLayoutEffect(() => {
    if (!open) return
    function update() {
      if (triggerRef.current) setLayout(measureLayout(triggerRef.current))
    }
    update()
    // Rotating a phone or resizing the window can call for another layout while the panel is open.
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function select(key: ThemeName) {
    setTheme(key)
    setOpen(false)
  }

  function renderDot(entry: ThemeEntry) {
    const label = labelOf(entry.key)
    return (
      <button
        key={entry.key}
        type="button"
        role="menuitemradio"
        aria-checked={theme === entry.key}
        onClick={() => select(entry.key)}
        title={label}
        aria-label={`${label} ${translate('theme.ariaLabelSuffix')}`}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
          theme === entry.key ? 'ring-2 ring-trim ring-offset-2 ring-offset-surface' : 'opacity-70 hover:opacity-100'
        }`}
      >
        <ThemeSwatch entry={entry} />
      </button>
    )
  }

  const { mode } = layout
  const wide = mode === 'wide'

  function renderGroup(group: (typeof TOPIC_GROUPS)[number], style?: CSSProperties) {
    return (
      <section key={group.title} className="flex min-w-0 flex-col gap-1.5" style={style}>
        <GroupTitle>{translate(group.title)}</GroupTitle>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${wide ? group.themes.length : 5}, minmax(0, 1fr))` }}
        >
          {group.themes.map((entry) => (
            <ThemeCard
              key={entry.key}
              entry={entry}
              active={theme === entry.key}
              label={labelOf(entry.key)}
              compact={wide}
              onSelect={() => select(entry.key)}
            />
          ))}
        </div>
      </section>
    )
  }

  const [classGroup, ...otherGroups] = TOPIC_GROUPS
  const classCount = classGroup.themes.length

  // The frame (with its corner brackets) stays put; only the content inside scrolls, so the
  // brackets can't stretch the scroll area.
  const panelStyle: CSSProperties =
    mode === 'sheet'
      ? { maxHeight: '92dvh' }
      : {
          top: layout.top,
          right: layout.right,
          width: wide ? '46rem' : '24rem',
          maxWidth: `calc(100vw - ${layout.right}px - ${EDGE_GAP}px)`,
          maxHeight: `calc(100dvh - ${layout.top}px - ${EDGE_GAP}px)`,
        }

  const effectsToggle = (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={effects}
      onClick={() => setEffects(!effects)}
      className="flex shrink-0 items-center gap-2 rounded-md px-1 py-0.5 text-left text-xs text-fg-muted transition hover:text-fg"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
          effects ? 'bg-trim/15 text-trim' : 'opacity-60'
        }`}
      >
        <SparklesIcon />
      </span>
      <span className="flex-1">{translate('theme.effects')}</span>
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition ${effects ? 'bg-trim' : 'bg-border'}`} aria-hidden>
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-surface transition-all ${effects ? 'left-3.5' : 'left-0.5'}`}
        />
      </span>
    </button>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`${translate('theme.choose')}: ${labelOf(active.key)}`}
        aria-label={translate('theme.choose')}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-trim/25 bg-surface transition ${
          open ? 'ring-2 ring-trim ring-offset-2 ring-offset-surface' : 'hover:border-trim/50'
        }`}
      >
        <ThemeSwatch entry={active} />
      </button>

      {open &&
        createPortal(
          <>
            {mode === 'sheet' && <div className="fixed inset-0 z-40 bg-black/45" aria-hidden />}
            <div
              ref={menuRef}
              role="menu"
              aria-label={translate('theme.choose')}
              className={`rpg-panel no-topic-corners fixed z-50 flex flex-col ${
                mode === 'sheet' ? 'inset-x-0 bottom-0 rounded-b-none pb-[env(safe-area-inset-bottom)]' : ''
              }`}
              style={panelStyle}
            >
              {mode === 'sheet' && (
                <div className="flex shrink-0 flex-col items-center gap-1.5 px-3 pt-2">
                  <span className="h-1 w-10 rounded-full bg-trim/40" aria-hidden />
                  <span className="font-display text-sm font-bold text-fg">{translate('theme.choose')}</span>
                </div>
              )}
              <div
                className={`flex min-h-0 flex-col overflow-y-auto overscroll-contain ${
                  mode === 'sheet' ? 'gap-3 p-3' : 'gap-2.5 p-2.5'
                }`}
              >
                <div className="flex items-end gap-3">
                  <section className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <GroupTitle>{translate('theme.group.basic')}</GroupTitle>
                    <div className={`flex flex-wrap ${mode === 'sheet' ? 'justify-between gap-1' : 'gap-1'}`}>
                      {THEMES.map(renderDot)}
                    </div>
                  </section>
                  {/* Low windows: the toggle moves up beside the dots to save a row. */}
                  {wide && effectsToggle}
                </div>
                {wide ? (
                  <>
                    {renderGroup(classGroup)}
                    {/* Worlds and seasons share one row on the class row's column grid, so their
                        cards are exactly as wide as the class cards. */}
                    <div className="grid gap-x-1" style={{ gridTemplateColumns: `repeat(${classCount}, minmax(0, 1fr))` }}>
                      {otherGroups.map((group) => renderGroup(group, { gridColumn: `span ${group.themes.length}` }))}
                    </div>
                  </>
                ) : (
                  TOPIC_GROUPS.map((group) => renderGroup(group))
                )}
                {!wide && (
                  <>
                    <div className="h-px shrink-0 bg-trim/20" aria-hidden />
                    {effectsToggle}
                  </>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
