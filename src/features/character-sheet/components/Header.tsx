import { StatPlate } from '../../../components/StatPlate'
import { useT } from '../../../i18n/useI18n'
import { classSummary } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'

/** Hero banner: framed portrait (or a monogram medallion when there's none), name, class/species
 * chips and the level/XP plate. */
export function Header({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const level = character.class.reduce((sum, c) => sum + c.level, 0)
  const details = [character.species, character.background, character.alignment].filter(Boolean)

  return (
    <header className="rpg-panel relative p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] bg-[radial-gradient(ellipse_60%_120%_at_0%_0%,color-mix(in_srgb,var(--color-trim)_16%,transparent),transparent_70%)]"
      />
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-4">
        {character.portrait_url ? (
          <img
            src={character.portrait_url}
            alt={`${character.name} portrait`}
            className="size-24 shrink-0 rounded-md border-2 border-trim object-cover shadow-[0_0_0_3px_var(--color-surface),0_0_0_4px_color-mix(in_srgb,var(--color-trim)_45%,transparent),0_0_22px_-4px_color-mix(in_srgb,var(--color-trim)_60%,transparent)]"
          />
        ) : (
          <div aria-hidden className="rpg-medallion !size-24 shrink-0 font-display text-4xl font-bold text-trim">
            {character.name.trim().charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1 basis-64">
          <h1 className="font-display text-3xl font-bold tracking-wide text-fg [text-shadow:0_0_28px_color-mix(in_srgb,var(--color-trim)_45%,transparent)] sm:text-4xl">
            {character.name}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-fg-muted">
            <span className="rounded-full border border-trim/40 bg-trim/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-trim">
              {classSummary(character)}
            </span>
            {details.map((d, i) => (
              <span key={i} className="flex items-center gap-2.5">
                <span aria-hidden className="size-1 rotate-45 bg-trim/60" />
                {d}
              </span>
            ))}
          </div>
        </div>

        <StatPlate label={t('stats.level')} value={String(level)} />
      </div>
    </header>
  )
}
