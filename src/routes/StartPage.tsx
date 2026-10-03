import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArcaneSigil } from '../components/ArcaneSigil'
import { VaultLoadingScreen } from '../components/VaultLoadingScreen'
import { useI18n } from '../i18n/useI18n'
import { sampleVaultImages } from '../sample-vault/images'
import { prefetchSampleVault, useVaultStore } from '../store/vaultStore'
import { preloadVaultPages } from './lazyPages'
import type { GitHubErrorKind, GitHubVaultRef } from '../vault/github/githubApi'
import { EMPTY_GITHUB_FORM, gitHubFormValues, type GitHubFormValues } from '../vault/github/githubForm'
import type { RecentVault } from '../vault/handleStore'
import { isFileSystemAccessSupported } from '../vault/vaultLoader'
import { ContinueCard } from './start/ContinueCard'
import { ChestIcon, PartyIcon, RepoIcon } from './start/portalIcons'
import { CardHead, Emblem, PortalCard } from './start/PortalCard'

// Only GitHub users ever open the form, so it stays out of the start page's bundle until hovered or used.
const loadGitHubDialog = () => import('../vault/github/GitHubVaultDialog')
const GitHubVaultDialog = lazy(() => loadGitHubDialog().then((m) => ({ default: m.GitHubVaultDialog })))
const prefetchGitHubDialog = () => void loadGitHubDialog().catch(() => {})

const EMBER_COUNT = 22

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

function Feature({ icon, title, body, index }: { icon: ReactNode; title: string; body: string; index: number }) {
  return (
    <div className="rise-in flex items-start gap-3" style={{ '--i': index + 6 } as CSSProperties}>
      <span className="feature-icon flex size-8 shrink-0 items-center justify-center rounded-lg border border-trim/30 bg-trim/5 text-trim">{icon}</span>
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
  const loadFromGitHub = useVaultStore((s) => s.loadFromGitHub)
  const loadSampleVault = useVaultStore((s) => s.loadSampleVault)
  const closeVault = useVaultStore((s) => s.closeVault)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  /** The "open from GitHub" form, when showing — with why the last attempt with these values failed. */
  const [githubForm, setGithubForm] = useState<{ values: GitHubFormValues; error: GitHubErrorKind | null } | null>(null)
  const samplePortraits = useMemo(() => [...sampleVaultImages.values()], [])

  useEffect(() => {
    void refreshRecents()
  }, [refreshRecents])

  // Visitors here are about to open a vault: fetch its pages once the start page has settled.
  useEffect(() => {
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(preloadVaultPages, { timeout: 3000 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(preloadVaultPages, 1500)
    return () => clearTimeout(id)
  }, [])

  const openedAt = (ok: boolean, target = '/characters') => {
    if (ok) navigate(target)
  }

  /** Reopens `values` in the form after a failed GitHub load, explaining what went wrong (e.g. an expired token). */
  const retryGitHub = (values: GitHubFormValues) => setGithubForm({ values, error: useVaultStore.getState().githubError })

  const openRecent = async (recent: RecentVault, target?: string) => {
    const ok = await openRecentVault(recent.id)
    if (!ok && recent.kind === 'github') retryGitHub(gitHubFormValues(recent.github, recent.token))
    else openedAt(ok, target ?? redirectedFrom)
  }

  const openGitHub = async (ref: GitHubVaultRef, token: string) => {
    // Closed while loading, so the loading screen shows; reopened with the same values if it fails.
    setGithubForm(null)
    if (await loadFromGitHub(ref, token)) openedAt(true)
    else retryGitHub(gitHubFormValues(ref, token))
  }

  const openFolder = async () => {
    if (isFileSystemAccessSupported()) openedAt(await loadFromDirectoryPicker())
    else fileInputRef.current?.click()
  }

  const openSample = async () => {
    if (await loadSampleVault()) navigate('/characters')
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
  // With the "currently open" bar showing, the hero shrinks so the page still fits without scrolling.
  const vaultOpen = source !== 'none' && !loading

  const githubCard = (
    <div className="rise-in md:col-span-2" style={{ '--i': 7 } as CSSProperties}>
      <PortalCard
        accent="var(--color-success)"
        onActivate={() => setGithubForm({ values: EMPTY_GITHUB_FORM, error: null })}
        onIntent={prefetchGitHubDialog}
        disabled={loading}
        className="h-full w-full text-left"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="min-w-0 flex-1">
            <CardHead
              emblem={
                <Emblem>
                  <RepoIcon />
                </Emblem>
              }
              eyebrow={t('github.cardEyebrow')}
              eyebrowClass="text-success"
              title={<h2 className="font-display text-xl font-bold tracking-wide text-fg">{t('github.cardTitle')}</h2>}
            />
            <p className="mt-2 text-sm leading-relaxed text-fg-muted tall:text-base">{t('github.cardBody')}</p>
          </div>
          <span className="rpg-button start-cta inline-block self-start sm:self-center">{t('github.cardAction')}</span>
        </div>
      </PortalCard>
    </div>
  )

  return (
    // Fills the height between header and footer: the hero, the current vault and the portals sit as
    // one group in the middle of the free space, the feature strip rests just above the footer.
    <div className="relative flex flex-1 flex-col">
      <Embers />

      <div className="relative z-[1] flex flex-1 flex-col">
        <div className="my-auto">
          {/* Hero: stacked on narrow screens; on wide ones the sigil stands beside the title, so the
              portals and the footer fit without scrolling. Laptop-height windows (`short`/`tight`)
              shrink it further and drop the eyebrow and tagline; with a vault open a `tight` window
              drops the hero altogether — the header already carries the name. */}
          <section
            className={`flex flex-col items-center text-center lg:flex-row lg:justify-center lg:gap-7 lg:text-left ${vaultOpen ? 'pb-4 pt-0 short:pb-3 tight:hidden tall:pb-7' : 'pb-6 pt-2 sm:pt-4 lg:pt-2 short:pb-4 tight:pb-2 tight:pt-0 tall:pb-9'}`}
          >
            <div className="rise-in relative shrink-0" style={{ '--i': 0 } as CSSProperties}>
              <div aria-hidden className="start-aura absolute inset-0 -z-10 rounded-full" />
              <ArcaneSigil className={vaultOpen ? 'size-16 sm:size-20 short:size-14 sm:short:size-16 tall:size-24 sm:tall:size-28' : 'size-24 sm:size-32 lg:size-28 short:size-20 sm:short:size-24 tight:size-16 sm:tight:size-16 lg:tall:size-36'} />
            </div>
            <div className="flex flex-col items-center lg:items-start">
              <p className={`rise-in text-[0.7rem] font-bold uppercase tracking-[0.35em] text-trim tight:hidden ${vaultOpen ? 'mt-2' : 'mt-4'} lg:mt-0`} style={{ '--i': 1 } as CSSProperties}>
                {t('start.eyebrow')}
              </p>
              <h1
                className={`rise-in start-title mt-2 font-display font-bold tracking-wide ${vaultOpen ? 'text-3xl sm:text-5xl sm:short:text-4xl sm:tall:text-6xl' : 'text-4xl sm:text-6xl sm:short:text-5xl sm:tight:text-4xl sm:tall:text-7xl'}`}
                style={{ '--i': 2 } as CSSProperties}
              >
                {t('app.brand')}
              </h1>
              <p className={`rise-in max-w-xl text-balance text-fg-muted short:text-sm tight:hidden ${vaultOpen ? 'mt-2' : 'mt-3'} lg:mt-2`} style={{ '--i': 3 } as CSSProperties}>
                {t('start.tagline')}
              </p>
              {!vaultOpen && (
                <div className="rise-in mt-4 flex w-64 items-center gap-3 short:hidden lg:hidden" style={{ '--i': 3 } as CSSProperties} aria-hidden>
                  <span className="h-px flex-1 bg-linear-to-r from-transparent to-trim/50" />
                  <span className="start-gem size-2 rotate-45 border border-trim bg-trim/30" />
                  <span className="h-px flex-1 bg-linear-to-l from-transparent to-trim/50" />
                </div>
              )}
            </div>
          </section>

          {!isFileSystemAccessSupported() && (
            <p
              role="note"
              className="rise-in mx-auto mb-5 max-w-2xl rounded-2xl border border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-warning"
              style={{ '--i': 3 } as CSSProperties}
            >
              {t('start.readOnlyBrowser')}
            </p>
          )}

          {redirectedFrom && source === 'none' && (
            <p className="rise-in mx-auto mb-5 w-fit rounded-full border border-warning/40 bg-warning/10 px-4 py-1.5 text-sm text-warning">
              {t('start.reconnectNotice')}
            </p>
          )}

          {vaultOpen && (
            <div className="rise-in current-vault mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-trim/30 px-5 py-2.5 short:mb-3 short:py-2 tall:mb-6 tall:py-3.5" style={{ '--i': 3 } as CSSProperties}>
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
          <div className="grid grid-cols-1 gap-4 short:gap-3 tall:gap-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
            <div className="rise-in md:col-span-2 lg:col-span-1 lg:row-span-2" style={{ '--i': 4 } as CSSProperties}>
              <ContinueCard onOpen={(r, target) => void openRecent(r, target)} />
            </div>

            {!isFileSystemAccessSupported() && githubCard}

            <div className="rise-in" style={{ '--i': 5 } as CSSProperties}>
              <PortalCard accent="var(--color-primary)" onActivate={() => void openFolder()} disabled={loading} className="h-full w-full text-left">
                <CardHead
                  emblem={
                    <Emblem>
                      <ChestIcon />
                    </Emblem>
                  }
                  eyebrow={t('start.openTitle')}
                  eyebrowClass="text-primary"
                  title={<h2 className="font-display text-xl font-bold tracking-wide text-fg">{t('vaultLoader.openVaultFolder')}</h2>}
                />
                <p className="mt-2.5 text-sm leading-relaxed text-fg-muted tall:text-base">{t('start.openBody')}</p>
                <div className="mt-auto pt-4">
                  <span className="rpg-button start-cta inline-block">{t('start.openAction')}</span>
                  {supportsFolderDrop() && (
                    <p className="mt-2.5 flex items-center gap-2 text-xs text-fg-muted">
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
              <PortalCard accent="var(--color-accent)" onActivate={() => void openSample()} onIntent={prefetchSampleVault} disabled={loading} className="h-full w-full text-left">
                <CardHead
                  emblem={
                    <Emblem>
                      <PartyIcon />
                    </Emblem>
                  }
                  eyebrow={t('vaultLoader.sampleData')}
                  eyebrowClass="text-accent"
                  title={<h2 className="font-display text-xl font-bold tracking-wide text-fg">{t('start.sampleTitle')}</h2>}
                />
                <p className="mt-2.5 text-sm leading-relaxed text-fg-muted tall:text-base">{t('start.sampleBody')}</p>
                <div className="mt-4 flex items-center">
                  {samplePortraits.map((src, i) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="sample-hero size-10 rounded-xl border-2 border-accent/70 bg-surface-2 object-cover"
                      style={{ '--i': i, '--n': samplePortraits.length } as CSSProperties}
                    />
                  ))}
                </div>
                <div className="mt-auto pt-4">
                  <span className="start-cta-accent inline-flex items-center gap-2 rounded-md border border-accent/50 bg-accent/10 px-3.5 py-1.5 font-display text-[0.72rem] font-bold uppercase tracking-[0.1em] text-accent transition group-hover:bg-accent/20">
                    {t('start.sampleAction')}
                    <span aria-hidden className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </PortalCard>
            </div>

            {isFileSystemAccessSupported() && githubCard}
          </div>
        </div>

        {/* Features — a nice-to-have: on wide but short screens they give way so the portals and the
            footer stay on one screen; where the page scrolls anyway (narrow screens) they stay. */}
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-trim/15 pt-5 pb-1 sm:grid-cols-2 lg:grid-cols-4 lg:short:hidden tall:mt-10">
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

      {githubForm && (
        <Suspense fallback={null}>
          <GitHubVaultDialog
            initial={githubForm.values}
            error={githubForm.error}
            onCancel={() => setGithubForm(null)}
            onSubmit={(ref, token) => void openGitHub(ref, token)}
          />
        </Suspense>
      )}

      {loading && <VaultLoadingScreen />}
    </div>
  )
}
