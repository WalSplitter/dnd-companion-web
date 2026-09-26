import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArcaneSigil } from '../components/ArcaneSigil'
import { VaultLoadingScreen } from '../components/VaultLoadingScreen'
import { formatRelativeTime } from '../i18n/relativeTime'
import { useI18n, type TranslateFn } from '../i18n/useI18n'
import { sampleVaultImages } from '../sample-vault'
import { useVaultStore } from '../store/vaultStore'
import type { RecentVault } from '../vault/handleStore'
import { isFileSystemAccessSupported } from '../vault/vaultLoader'

const EMBER_COUNT = 22

function characterPath(name: string) {
  return `/characters/${encodeURIComponent(name)}`
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** Whether folders dropped on the page can be opened (Chromium's `getAsFileSystemHandle`). */
function supportsFolderDrop(): boolean {
  return typeof DataTransferItem !== 'undefined' && 'getAsFileSystemHandle' in DataTransferItem.prototype
}

/** Sparks drifting up behind the page. Positions are derived from the index, so they're stable across renders. */
function Embers() {
  const embers = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, (_, i) => {
        const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
        return {
          left: `${(r(1) * 100).toFixed(1)}%`,
          '--size': `${(2 + r(2) * 4).toFixed(1)}px`,
          '--drift': `${((r(3) - 0.5) * 120).toFixed(0)}px`,
          animationDuration: `${(9 + r(4) * 10).toFixed(1)}s`,
          animationDelay: `${(-r(5) * 18).toFixed(1)}s`,
        } as CSSProperties
      }),
    [],
  )
  return (
    <div className="start-embers" aria-hidden>
      {embers.map((style, i) => (
        <span key={i} className="start-ember" style={style} />
      ))}
    </div>
  )
}

/**
 * A card that tilts toward the pointer and lights up where it is, with a spinning gilded rim on
 * hover. `accent` tints it (any CSS colour). Rendered as a button when it has a single action.
 */
function PortalCard({
  accent,
  onActivate,
  disabled,
  className = '',
  children,
}: {
  accent: string
  onActivate?: () => void
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)

  function track(e: PointerEvent) {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
    el.style.setProperty('--ry', `${((x - 0.5) * 7).toFixed(2)}deg`)
    el.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`)
  }

  function reset() {
    ref.current?.style.setProperty('--rx', '0deg')
    ref.current?.style.setProperty('--ry', '0deg')
  }

  const props = {
    className: `portal-card group ${className}`,
    style: { '--portal': accent } as CSSProperties,
    onPointerMove: track,
    onPointerLeave: reset,
  }
  const inner = <div className="portal-card-inner flex h-full flex-col p-6">{children}</div>

  return onActivate ? (
    <button ref={ref as RefObject<HTMLButtonElement>} type="button" onClick={onActivate} disabled={disabled} {...props}>
      {inner}
    </button>
  ) : (
    <div ref={ref as RefObject<HTMLDivElement>} {...props}>
      {inner}
    </div>
  )
}

function Emblem({ children }: { children: ReactNode }) {
  return <div className="portal-emblem mb-5 flex size-16 shrink-0 items-center justify-center rounded-2xl">{children}</div>
}

function BookIcon() {
  return (
    <svg viewBox="0 0 48 48" className="portal-float size-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M24 12c-4-3-10-4-17-3v27c7-1 13 0 17 3 4-3 10-4 17-3V9c-7-1-13 0-17 3Z" fill="color-mix(in srgb, currentColor 12%, transparent)" />
      <path d="M24 12v27" />
      <path className="book-mark" d="M31 10v12l3-2.5 3 2.5V9.4" fill="currentColor" />
    </svg>
  )
}

function ChestIcon() {
  return (
    <svg viewBox="0 0 48 48" className="portal-float size-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <rect x="7" y="22" width="34" height="18" rx="2" fill="color-mix(in srgb, currentColor 12%, transparent)" />
      <path d="M7 30h34M24 26v8" />
      <circle className="chest-keyhole" cx="24" cy="30" r="2.6" fill="currentColor" stroke="none" />
      <g className="chest-lid">
        <path d="M7 22v-4a10 8 0 0 1 10-8h14a10 8 0 0 1 10 8v4Z" fill="color-mix(in srgb, currentColor 18%, transparent)" />
        <path d="M17 10v12M31 10v12" strokeOpacity="0.6" />
      </g>
      <g className="chest-glow" stroke="none" fill="currentColor">
        <circle cx="16" cy="16" r="1.2" />
        <circle cx="24" cy="12" r="1.5" />
        <circle cx="32" cy="15" r="1.1" />
      </g>
    </svg>
  )
}

function Medallion({ name, index, image }: { name: string; index: number; image?: string }) {
  return (
    <span
      className="recent-medallion flex size-8 items-center justify-center overflow-hidden rounded-full border-2 border-trim/70 bg-surface-2 font-display text-[0.65rem] font-bold text-trim"
      style={{ '--i': index } as CSSProperties}
      title={name}
    >
      {image ? <img src={image} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  )
}

function RecentMeta({ recent, t, lang }: { recent: RecentVault; t: TranslateFn; lang: 'en' | 'de' }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-fg-muted">
      {recent.ruleset && recent.ruleset !== 'unknown' && (
        <span className="rounded-full border border-trim/35 bg-trim/10 px-2 py-0.5 font-semibold text-trim">{t(`ruleset.${recent.ruleset}`)}</span>
      )}
      {recent.characterCount !== undefined && <span>{t('start.characterCount', { n: recent.characterCount })}</span>}
      <span className="flex items-center gap-2.5">
        <span aria-hidden className="size-1 rotate-45 bg-trim/60" />
        {t('start.openedAgo', { ago: formatRelativeTime(recent.openedAt, lang) })}
      </span>
    </div>
  )
}

function ContinueCard({ onOpen }: { onOpen: (recent: RecentVault, target?: string) => void }) {
  const { t, lang } = useI18n()
  const recents = useVaultStore((s) => s.recents)
  const recentsLoaded = useVaultStore((s) => s.recentsLoaded)
  const recentId = useVaultStore((s) => s.recentId)
  const forget = useVaultStore((s) => s.forgetRecentVault)
  const [latest, ...older] = recents
  const supported = isFileSystemAccessSupported()

  return (
    <PortalCard accent="var(--color-trim)" className="h-full">
      <Emblem>
        <BookIcon />
      </Emblem>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-trim">{t('start.continueHeading')}</p>

      {latest ? (
        <div className="mt-3 flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 truncate font-display text-2xl font-bold tracking-wide text-fg" title={latest.name}>
              {latest.name}
            </h2>
            {recentId === latest.id && <span className="recent-live mt-2.5 size-2.5 shrink-0 rounded-full bg-success" title={t('start.currentLabel')} />}
          </div>
          <div className="mt-2">
            <RecentMeta recent={latest} t={t} lang={lang} />
          </div>
          {latest.characters && latest.characters.length > 0 && (
            <div className="mt-4 flex -space-x-2">
              {latest.characters.map((name, i) => (
                <Medallion key={name} name={name} index={i} />
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" className="rpg-button start-cta" onClick={() => onOpen(latest)}>
              {t('start.reopen')}
            </button>
            {latest.lastCharacter && (
              <button
                type="button"
                onClick={() => onOpen(latest, characterPath(latest.lastCharacter!))}
                className="group/cta inline-flex items-center gap-1.5 rounded-md border border-trim/40 px-3 py-1.5 text-sm font-medium text-fg transition hover:border-trim hover:bg-trim/10"
              >
                {t('start.continueWith', { name: latest.lastCharacter })}
                <span aria-hidden className="transition-transform group-hover/cta:translate-x-0.5">
                  →
                </span>
              </button>
            )}
          </div>
          <p className="mt-2 text-[0.7rem] text-fg-muted/80">{t('start.permissionHint')}</p>

          {older.length > 0 && (
            <div className="mt-5 border-t border-trim/15 pt-4">
              <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-fg-muted">{t('start.recentHeading')}</p>
              <ul className="space-y-1">
                {older.map((r) => (
                  <li key={r.id} className="recent-row group/row flex items-center gap-2 rounded-lg">
                    <button
                      type="button"
                      onClick={() => onOpen(r)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-trim/10"
                    >
                      <span aria-hidden className="size-1.5 shrink-0 rotate-45 border border-trim/60 transition group-hover/row:bg-trim" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{r.name}</span>
                      <span className="shrink-0 text-xs text-fg-muted">{formatRelativeTime(r.openedAt, lang)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void forget(r.id)}
                      title={t('start.forget')}
                      aria-label={`${t('start.forget')}: ${r.name}`}
                      className="shrink-0 rounded-md px-2 py-1 text-fg-muted opacity-0 transition hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover/row:opacity-100"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={() => void forget(latest.id)}
            className="mt-auto self-start pt-4 text-[0.7rem] text-fg-muted/70 underline-offset-4 transition hover:text-danger hover:underline"
          >
            {t('start.forget')}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-1 flex-col justify-center">
          <p className="text-sm leading-relaxed text-fg-muted">
            {!supported ? t('start.unsupported') : recentsLoaded ? t('start.noRecents') : ' '}
          </p>
          <div aria-hidden className="mt-6 flex gap-2 opacity-40">
            {[0, 1, 2].map((i) => (
              <span key={i} className="recent-ghost h-10 flex-1 rounded-lg border border-dashed border-trim/40" style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
        </div>
      )}
    </PortalCard>
  )
}

function Feature({ icon, title, body, index }: { icon: ReactNode; title: string; body: string; index: number }) {
  return (
    <div className="rise-in flex items-start gap-3" style={{ '--i': index + 6 } as CSSProperties}>
      <span className="feature-icon flex size-9 shrink-0 items-center justify-center rounded-lg border border-trim/30 bg-trim/5 text-trim">{icon}</span>
      <div>
        <p className="font-display text-sm font-bold tracking-wide text-fg">{title}</p>
        <p className="text-xs leading-relaxed text-fg-muted">{body}</p>
      </div>
    </div>
  )
}

const ICON = { className: 'size-4.5', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** The landing page: pick up the last vault, open a new folder (picker or drag & drop), or try the sample. */
export function StartPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectedFrom = (location.state as { from?: string } | null)?.from
  const status = useVaultStore((s) => s.status)
  const source = useVaultStore((s) => s.source)
  const vaultName = useVaultStore((s) => s.vaultName)
  const characterCount = useVaultStore((s) => s.vault.characters.length)
  const ruleset = useVaultStore((s) => s.ruleset.ruleset)
  const refreshRecents = useVaultStore((s) => s.refreshRecents)
  const openRecentVault = useVaultStore((s) => s.openRecentVault)
  const loadFromDirectoryPicker = useVaultStore((s) => s.loadFromDirectoryPicker)
  const loadFromDirectoryHandle = useVaultStore((s) => s.loadFromDirectoryHandle)
  const loadFromFileList = useVaultStore((s) => s.loadFromFileList)
  const loadSampleVault = useVaultStore((s) => s.loadSampleVault)
  const closeVault = useVaultStore((s) => s.closeVault)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  const samplePortraits = useMemo(() => [...sampleVaultImages.values()], [])

  useEffect(() => {
    void refreshRecents()
  }, [refreshRecents])

  const openedAt = (ok: boolean, target = '/characters') => {
    if (ok) navigate(target)
  }

  const openRecent = async (recent: RecentVault, target?: string) => openedAt(await openRecentVault(recent.id), target ?? redirectedFrom)

  const openFolder = async () => {
    if (isFileSystemAccessSupported()) openedAt(await loadFromDirectoryPicker())
    else fileInputRef.current?.click()
  }

  const openSample = () => {
    loadSampleVault()
    navigate('/characters')
  }

  // Drag a vault folder anywhere onto the page to open it.
  useEffect(() => {
    if (!supportsFolderDrop()) return
    let depth = 0
    const hasFiles = (e: DragEvent) => Boolean(e.dataTransfer?.types.includes('Files'))
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      setDragging(true)
    }
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onLeave = () => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      // Must be requested synchronously inside the drop event, before the data transfer is cleared.
      const pending = e.dataTransfer?.items[0]?.getAsFileSystemHandle?.()
      void pending?.then(async (handle) => {
        if (handle?.kind !== 'directory') {
          setDropError(t('start.dropNotFolder'))
          return
        }
        setDropError(null)
        if (await loadFromDirectoryHandle(handle)) navigate('/characters')
      })
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [loadFromDirectoryHandle, navigate, t])

  const loading = status === 'loading'

  return (
    <div className="relative">
      <Embers />

      <div className="relative z-[1]">
        {/* Hero */}
        <section className="flex flex-col items-center pb-10 pt-4 text-center sm:pt-8">
          <div className="rise-in relative" style={{ '--i': 0 } as CSSProperties}>
            <div aria-hidden className="start-aura absolute inset-0 -z-10 rounded-full" />
            <ArcaneSigil className="size-36 sm:size-44" />
          </div>
          <p className="rise-in mt-6 text-[0.7rem] font-bold uppercase tracking-[0.35em] text-trim" style={{ '--i': 1 } as CSSProperties}>
            {t('start.eyebrow')}
          </p>
          <h1 className="rise-in start-title mt-3 font-display text-4xl font-bold tracking-wide sm:text-6xl" style={{ '--i': 2 } as CSSProperties}>
            {t('app.brand')}
          </h1>
          <p className="rise-in mt-4 max-w-xl text-balance text-fg-muted" style={{ '--i': 3 } as CSSProperties}>
            {t('start.tagline')}
          </p>
          <div className="rise-in mt-6 flex w-64 items-center gap-3" style={{ '--i': 3 } as CSSProperties} aria-hidden>
            <span className="h-px flex-1 bg-linear-to-r from-transparent to-trim/50" />
            <span className="start-gem size-2 rotate-45 border border-trim bg-trim/30" />
            <span className="h-px flex-1 bg-linear-to-l from-transparent to-trim/50" />
          </div>
        </section>

        {redirectedFrom && source === 'none' && (
          <p className="rise-in mx-auto mb-5 w-fit rounded-full border border-warning/40 bg-warning/10 px-4 py-1.5 text-sm text-warning">
            {t('start.reconnectNotice')}
          </p>
        )}

        {source !== 'none' && !loading && (
          <div className="rise-in current-vault mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-trim/30 px-5 py-3" style={{ '--i': 3 } as CSSProperties}>
            <span className="recent-live size-2.5 shrink-0 rounded-full bg-success" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-fg-muted">{t('start.currentLabel')}</p>
              <p className="truncate font-display text-lg font-bold text-fg">
                {source === 'sample' ? t('vaultLoader.sampleData') : vaultName}
                <span className="ml-3 font-sans text-xs font-normal text-fg-muted">
                  {ruleset !== 'unknown' && `${t(`ruleset.${ruleset}`)} · `}
                  {t('start.characterCount', { n: characterCount })}
                </span>
              </p>
            </div>
            <button type="button" onClick={closeVault} className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg">
              {t('start.closeVault')}
            </button>
            <button type="button" onClick={() => navigate('/characters')} className="rpg-button start-cta">
              {t('start.toCharacters')} →
            </button>
          </div>
        )}

        {/* Portals */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div className="rise-in md:col-span-2 lg:col-span-1" style={{ '--i': 4 } as CSSProperties}>
            <ContinueCard onOpen={(r, target) => void openRecent(r, target)} />
          </div>

          <div className="rise-in" style={{ '--i': 5 } as CSSProperties}>
            <PortalCard accent="var(--color-primary)" onActivate={() => void openFolder()} disabled={loading} className="h-full w-full text-left">
              <Emblem>
                <ChestIcon />
              </Emblem>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{t('start.openTitle')}</p>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-wide text-fg">{t('vaultLoader.openVaultFolder')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{t('start.openBody')}</p>
              <div className="mt-auto pt-6">
                <span className="rpg-button start-cta inline-block">{t('start.openAction')}</span>
                {supportsFolderDrop() && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-fg-muted">
                    <svg {...ICON} className="size-4 text-primary">
                      <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                    </svg>
                    {t('start.dropHint')}
                  </p>
                )}
                {dropError && <p className="mt-2 text-xs text-danger">{dropError}</p>}
              </div>
            </PortalCard>
            <input
              ref={fileInputRef}
              type="file"
              // @ts-expect-error non-standard attribute, only relevant as a fallback for browsers without FSA
              webkitdirectory=""
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) void loadFromFileList(e.target.files).then((ok) => openedAt(ok))
              }}
            />
          </div>

          <div className="rise-in" style={{ '--i': 6 } as CSSProperties}>
            <PortalCard accent="var(--color-accent)" onActivate={openSample} disabled={loading} className="h-full w-full text-left">
              <div className="mb-5 flex h-16 items-center">
                {samplePortraits.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="sample-hero size-14 rounded-xl border-2 border-accent/70 bg-surface-2 object-cover"
                    style={{ '--i': i } as CSSProperties}
                  />
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{t('vaultLoader.sampleData')}</p>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-wide text-fg">{t('start.sampleTitle')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{t('start.sampleBody')}</p>
              <div className="mt-auto pt-6">
                <span className="start-cta-accent inline-flex items-center gap-2 rounded-md border border-accent/50 bg-accent/10 px-3.5 py-1.5 font-display text-[0.72rem] font-bold uppercase tracking-[0.1em] text-accent transition group-hover:bg-accent/20">
                  {t('start.sampleAction')}
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>
            </PortalCard>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 gap-6 border-t border-trim/15 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            index={0}
            title={t('start.featureLocalTitle')}
            body={t('start.featureLocalBody')}
            icon={
              <svg {...ICON}>
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            }
          />
          <Feature
            index={1}
            title={t('start.featureWriteTitle')}
            body={t('start.featureWriteBody')}
            icon={
              <svg {...ICON}>
                <path d="M20 4c-6 1-11 6-13 13l-2 3 3-2c7-2 12-7 12-14Z" />
                <path d="M7 17 13 11" />
              </svg>
            }
          />
          <Feature
            index={2}
            title={t('start.featureObsidianTitle')}
            body={t('start.featureObsidianBody')}
            icon={
              <svg {...ICON}>
                <path d="M9 7H7a5 5 0 0 0 0 10h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" />
              </svg>
            }
          />
          <Feature
            index={3}
            title={t('start.featureThemesTitle')}
            body={t('start.featureThemesBody')}
            icon={
              <svg {...ICON}>
                <path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-1.2-1-1.4-1-2.4 0-.9.7-1.5 1.6-1.5H16a5 5 0 0 0 5-5c0-4.2-4-7.5-9-7.5Z" />
                <circle cx="7.5" cy="11" r="1" fill="currentColor" />
                <circle cx="10" cy="7" r="1" fill="currentColor" />
                <circle cx="15" cy="7.5" r="1" fill="currentColor" />
              </svg>
            }
          />
        </div>
      </div>

      {dragging && (
        <div className="drop-veil fixed inset-0 z-30 flex items-center justify-center p-6" aria-hidden>
          <div className="drop-frame flex h-full w-full flex-col items-center justify-center gap-4 rounded-3xl">
            <ChestIcon />
            <p className="font-display text-2xl font-bold tracking-wide text-fg">{t('start.dropOverlay')}</p>
          </div>
        </div>
      )}

      {loading && <VaultLoadingScreen />}
    </div>
  )
}
