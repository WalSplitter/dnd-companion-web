import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { VaultLoadingScreen } from '../components/VaultLoadingScreen'
import { useI18n } from '../i18n/useI18n'
import { sampleVaultImages } from '../sample-vault/images'
import { prefetchSampleVault, useVaultStore } from '../store/vaultStore'
import { preloadVaultPages } from './lazyPages'
import type { GitHubErrorKind, GitHubVaultRef } from '../vault/github/githubApi'
import { EMPTY_GITHUB_FORM, gitHubFormValues, type GitHubFormValues } from '../vault/github/githubForm'
import type { RecentVault } from '../vault/handleStore'
import { isFileSystemAccessSupported } from '../vault/vaultLoader'
import { inOwlbear } from '../owlbear/host'
import { ContinueCard } from './start/ContinueCard'
import { CurrentVaultBar } from './start/CurrentVaultBar'
import { Embers } from './start/Embers'
import { FeatureStrip } from './start/FeatureStrip'
import { ChestIcon, DropIcon, PartyIcon, RepoIcon } from './start/portalIcons'
import { CardHead, Emblem, PortalCard } from './start/PortalCard'
import { StartHero } from './start/StartHero'
import { supportsFolderDrop, useFolderDrop, type DroppedHandle } from './start/useFolderDrop'

// Only GitHub users ever open the form, so it stays out of the start page's bundle until hovered or used.
const loadGitHubDialog = () => import('../features/vault-access/GitHubVaultDialog')
const GitHubVaultDialog = lazy(() => loadGitHubDialog().then((m) => ({ default: m.GitHubVaultDialog })))
const prefetchGitHubDialog = () => void loadGitHubDialog().catch(() => {})

/** The landing page: pick up the last vault, open a new folder (picker or drag & drop), or try the sample. */
export function StartPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectedFrom = (location.state as { from?: string } | null)?.from
  const status = useVaultStore((s) => s.status)
  const source = useVaultStore((s) => s.source)
  const refreshRecents = useVaultStore((s) => s.refreshRecents)
  const openRecentVault = useVaultStore((s) => s.openRecentVault)
  const loadFromDirectoryPicker = useVaultStore((s) => s.loadFromDirectoryPicker)
  const loadFromDirectoryHandle = useVaultStore((s) => s.loadFromDirectoryHandle)
  const loadFromFileList = useVaultStore((s) => s.loadFromFileList)
  const loadFromGitHub = useVaultStore((s) => s.loadFromGitHub)
  const loadSampleVault = useVaultStore((s) => s.loadSampleVault)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
  const onFolderDrop = useCallback(
    async (handle: DroppedHandle) => {
      if (handle?.kind !== 'directory') {
        setDropError(t('start.dropNotFolder'))
        return
      }
      setDropError(null)
      if (await loadFromDirectoryHandle(handle)) navigate('/characters')
    },
    [loadFromDirectoryHandle, navigate, t],
  )
  const dragging = useFolderDrop(onFolderDrop)

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
          <StartHero vaultOpen={vaultOpen} />

          {inOwlbear ? (
            <p
              role="note"
              className="rise-in mx-auto mb-5 max-w-2xl rounded-2xl border border-trim/40 bg-trim/10 px-4 py-2 text-center text-sm text-fg-muted"
              style={{ '--i': 3 } as CSSProperties}
            >
              {t('owlbear.startNote')}
            </p>
          ) : (
            !isFileSystemAccessSupported() && (
              <p
                role="note"
                className="rise-in mx-auto mb-5 max-w-2xl rounded-2xl border border-warning/40 bg-warning/10 px-4 py-2 text-center text-sm text-warning"
                style={{ '--i': 3 } as CSSProperties}
              >
                {t('start.readOnlyBrowser')}
              </p>
            )
          )}

          {redirectedFrom && source === 'none' && (
            <p className="rise-in mx-auto mb-5 w-fit rounded-full border border-warning/40 bg-warning/10 px-4 py-1.5 text-sm text-warning">
              {t('start.reconnectNotice')}
            </p>
          )}

          {vaultOpen && <CurrentVaultBar />}

          {/* Portals */}
          <div className="grid grid-cols-1 gap-4 short:gap-3 tall:gap-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
            <div className="rise-in md:col-span-2 lg:col-span-1 lg:row-span-2" style={{ '--i': 4 } as CSSProperties}>
              <ContinueCard onOpen={(r, target) => void openRecent(r, target)} />
            </div>

            {!isFileSystemAccessSupported() && githubCard}

            {/* Owlbear's frame can't hand out folders: a read-only copy that has to be picked again every
                session would only lure players away from the GitHub vault that works there. */}
            {!inOwlbear && (
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
                        <DropIcon />
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
            )}

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

        <FeatureStrip />
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
