import { useContext } from 'react'
import { ConditionChips } from '../../../components/ConditionChips'
import { StatPlate } from '../../../components/StatPlate'
import { useT } from '../../../i18n/useI18n'
import { LiveCharacterContext } from '../../../owlbear/liveEdit'
import { useCanEdit } from '../../../store/canEdit'
import { useVaultStore } from '../../../store/vaultStore'
import { activeConditions } from '../../../rules/conditions'
import { classSummary, totalCharacterLevel } from '../../../rules/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'

/**
 * The conditions the character has, from its file — set and removed here in edit mode. While the
 * character is live in Owlbear Rodeo, the bar above the sheet shows the room's instead.
 */
function SheetConditions({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const live = useContext(LiveCharacterContext)
  const canEdit = useCanEdit()
  const setConditions = useVaultStore((s) => s.setConditions)
  const conditions = activeConditions(character)
  const editable = canEdit && Boolean(character._write?.conditions_active)
  if (live || (!editable && conditions.length === 0)) return null
  return (
    <div className="mt-3">
      <ConditionChips conditions={conditions} onChange={editable ? (next) => void setConditions(characterPath, next) : undefined} />
    </div>
  )
}

/** Hero banner: framed portrait (or a monogram medallion when there's none), name, class/species
 * chips, the conditions and the level/XP plate. */
export function Header({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const level = totalCharacterLevel(character)
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
          <SheetConditions character={character} characterPath={characterPath} />
        </div>

        <StatPlate label={t('stats.level')} value={String(level)} />
      </div>
    </header>
  )
}
