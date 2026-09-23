import { Link } from 'react-router-dom'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import { classSummary, totalCharacterLevel } from '../vault/deriveStats'
import type { CharacterFrontmatter } from '../vault/types'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** Mirrors HitPoints.tsx's hpFillClass: healthy → bloodied → critical. */
function hpFillClass(pct: number): string {
  if (pct > 50) return 'from-success/60 to-success'
  if (pct > 25) return 'from-warning/60 to-warning'
  return 'from-danger/60 to-danger'
}

function CharacterCard({ frontmatter }: { frontmatter: CharacterFrontmatter }) {
  const hpPct = frontmatter.hp.max > 0 ? Math.max(0, Math.min(100, (frontmatter.hp.current / frontmatter.hp.max) * 100)) : 0

  return (
    <div className="rpg-panel group relative p-4 transition duration-200 hover:-translate-y-1 hover:shadow-[0_0_24px_-6px_var(--color-trim)]">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {frontmatter.portrait_url ? (
            <img
              src={frontmatter.portrait_url}
              alt=""
              className="size-14 rounded-md border-2 border-trim object-cover shadow-[0_0_0_2px_var(--color-surface),0_0_16px_-4px_color-mix(in_srgb,var(--color-trim)_60%,transparent)]"
            />
          ) : (
            <div aria-hidden className="rpg-medallion !size-14 font-display text-xl font-bold text-trim">
              {initials(frontmatter.name)}
            </div>
          )}
          <span className="absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border-2 border-trim bg-surface font-num text-xs font-bold text-trim shadow-[0_0_8px_color-mix(in_srgb,var(--color-trim)_55%,transparent)]">
            {totalCharacterLevel(frontmatter)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-bold tracking-wide text-fg">{frontmatter.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate rounded-full border border-trim/40 bg-trim/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-trim">
              {classSummary(frontmatter)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-fg-muted">
            <span aria-hidden className="size-1 shrink-0 rotate-45 bg-trim/60" />
            {frontmatter.species} · {frontmatter.background}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="relative h-2.5 overflow-hidden rounded-full border border-trim/60 bg-black/35 shadow-[inset_0_2px_4px_rgb(0_0_0/0.55)]">
            <div className={`h-full rounded-full bg-linear-to-r transition-[width] ${hpFillClass(hpPct)}`} style={{ width: `${hpPct}%` }} />
          </div>
          <div className="mt-0.5 text-right font-num text-[0.7rem] text-fg-muted">
            {frontmatter.hp.current}/{frontmatter.hp.max}
          </div>
        </div>
        <div className="rpg-plate flex shrink-0 items-center gap-1 px-2 py-1 font-num text-xs font-bold text-fg">
          {frontmatter.armor_class}
        </div>
      </div>
    </div>
  )
}

export function CharacterListPage() {
  const t = useT()
  const characters = useVaultStore((s) => s.vault.characters)

  if (characters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-fg-muted">
        {t('characterList.emptyBefore')} <code className="rounded bg-surface-2 px-1 py-0.5">type: character</code>{' '}
        {t('characterList.emptyAfter')}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-fg">{t('characterList.title')}</h1>
        <span className="text-sm text-fg-muted">{characters.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {characters.map((c) => (
          <Link key={c.path} to={`/characters/${encodeURIComponent(c.frontmatter.name)}`} className="block">
            <CharacterCard frontmatter={c.frontmatter} />
          </Link>
        ))}
      </div>
    </div>
  )
}
