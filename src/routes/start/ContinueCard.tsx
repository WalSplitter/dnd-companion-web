import type { CSSProperties } from 'react'
import { initials } from '../../components/initials'
import { formatRelativeTime } from '../../i18n/relativeTime'
import { useI18n, type TranslateFn } from '../../i18n/useI18n'
import { useVaultStore } from '../../store/vaultStore'
import type { RecentVault } from '../../vault/handleStore'
import { isFileSystemAccessSupported } from '../../vault/vaultLoader'
import { characterRoute } from '../paths'
import { BookIcon } from './portalIcons'
import { CardHead, Emblem, PortalCard } from './PortalCard'

/** Marks a recents entry that was opened from a GitHub repository (hover: which one). */
function GitHubBadge({ recent, t }: { recent: RecentVault; t: TranslateFn }) {
  if (recent.kind !== 'github') return null
  const { owner, repo, branch, subpath } = recent.github
  return (
    <span className="shrink-0 rounded-full border border-fg-muted/35 px-2 py-0.5 text-[0.65rem] font-semibold text-fg-muted" title={`${owner}/${repo}@${branch}${subpath ? ` · ${subpath}` : ''}`}>
      {t('github.sourceBadge')}
    </span>
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
      <GitHubBadge recent={recent} t={t} />
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

export function ContinueCard({ onOpen }: { onOpen: (recent: RecentVault, target?: string) => void }) {
  const { t, lang } = useI18n()
  const recents = useVaultStore((s) => s.recents)
  const recentsLoaded = useVaultStore((s) => s.recentsLoaded)
  const recentId = useVaultStore((s) => s.recentId)
  const forget = useVaultStore((s) => s.forgetRecentVault)
  const [latest, ...older] = recents
  const supported = isFileSystemAccessSupported()

  return (
    <PortalCard accent="var(--color-trim)" className="h-full">
      <CardHead
        emblem={
          <Emblem>
            <BookIcon />
          </Emblem>
        }
        eyebrow={t('start.continueHeading')}
        eyebrowClass="text-trim"
        title={
          latest && (
            <div className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate font-display text-xl font-bold tracking-wide text-fg" title={latest.name}>
                {latest.name}
              </h2>
              {recentId === latest.id && <span className="recent-live size-2.5 shrink-0 rounded-full bg-success" title={t('start.currentLabel')} />}
            </div>
          )
        }
      />

      {latest ? (
        <div className="mt-3 flex flex-1 flex-col">
          <div>
            <RecentMeta recent={latest} t={t} lang={lang} />
          </div>
          {latest.characters && latest.characters.length > 0 && (
            <div className="mt-3 flex -space-x-2">
              {latest.characters.map((name, i) => (
                <Medallion key={name} name={name} index={i} />
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className="rpg-button start-cta" onClick={() => onOpen(latest)}>
              {t('start.reopen')}
            </button>
            {latest.lastCharacter && (
              <button
                type="button"
                onClick={() => onOpen(latest, characterRoute(latest.lastCharacter!))}
                className="group/cta inline-flex items-center gap-1.5 rounded-md border border-trim/40 px-3 py-1.5 text-sm font-medium text-fg transition hover:border-trim hover:bg-trim/10"
              >
                {t('start.continueWith', { name: latest.lastCharacter })}
                <span aria-hidden className="transition-transform group-hover/cta:translate-x-0.5">
                  →
                </span>
              </button>
            )}
          </div>
          {latest.kind === 'folder' && <p className="mt-2 text-[0.7rem] text-fg-muted/80 tight:hidden">{t('start.permissionHint')}</p>}

          {older.length > 0 && (
            <div className="mt-4 border-t border-trim/15 pt-3">
              <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-fg-muted">{t('start.recentHeading')}</p>
              <ul className="space-y-0.5">
                {older.map((r) => (
                  <li key={r.id} className="recent-row group/row flex items-center gap-2 rounded-lg">
                    <button
                      type="button"
                      onClick={() => onOpen(r)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 text-left transition hover:bg-trim/10"
                    >
                      <span aria-hidden className="size-1.5 shrink-0 rotate-45 border border-trim/60 transition group-hover/row:bg-trim" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{r.name}</span>
                      <GitHubBadge recent={r} t={t} />
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
            className="mt-auto self-start pt-3 text-[0.7rem] text-fg-muted/70 underline-offset-4 transition hover:text-danger hover:underline"
          >
            {t('start.forget')}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-1 flex-col justify-center">
          <p className="text-sm leading-relaxed text-fg-muted">
            {!supported ? t('start.unsupported') : recentsLoaded ? t('start.noRecents') : ' '}
          </p>
          <div aria-hidden className="mt-4 flex gap-2 opacity-40">
            {[0, 1, 2].map((i) => (
              <span key={i} className="recent-ghost h-10 flex-1 rounded-lg border border-dashed border-trim/40" style={{ '--i': i } as CSSProperties} />
            ))}
          </div>
        </div>
      )}
    </PortalCard>
  )
}
