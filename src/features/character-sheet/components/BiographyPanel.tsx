import type { ReactNode } from 'react'
import { Card } from '../../../components/Card'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import { classSummary, totalCharacterLevel } from '../../../vault/deriveStats'
import type { AppearanceKey, CharacterFrontmatter } from '../../../vault/types'
import { renderObsidianBody } from '../../../vault/components/renderObsidian'

const APPEARANCE_LABEL: Record<AppearanceKey, TranslationKey> = {
  gender: 'bio.appearance.gender',
  age: 'bio.appearance.age',
  size: 'bio.appearance.size',
  height: 'bio.appearance.height',
  weight: 'bio.appearance.weight',
  eyes: 'bio.appearance.eyes',
  hair: 'bio.appearance.hair',
  skin: 'bio.appearance.skin',
}

/** Whether the character has anything for the Biography tab — the tab only appears then. */
export function hasBiography(character: CharacterFrontmatter, story: string | undefined): boolean {
  return Boolean(story?.trim()) || character.biography !== undefined
}

function Facts({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-trim/10 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="text-fg-muted">{row.label}</dt>
          <dd className="text-right text-fg">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** One of the four classic roleplay prompts (traits, ideals, bonds, flaws), skipped when empty. */
function Prompt({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.16em] text-trim">
        <span aria-hidden className="size-1.5 rotate-45 bg-trim/70" />
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-fg/90">{children}</div>
    </section>
  )
}

/**
 * The Biography tab: who the character is beyond the numbers — read between sessions or in a
 * roleplay moment, not mid-combat, so it gets its own tab instead of a card on the sheet. A large
 * portrait with the key facts and the appearance on the left; the full backstory (no "show more")
 * and the personality prompts on the right. Every part is optional (see `resolveBiography`).
 */
export function BiographyPanel({ character: c, story }: { character: CharacterFrontmatter; story: string | undefined }) {
  const t = useT()
  const bio = c.biography
  const rendered = renderObsidianBody(story)
  const prompts = [
    bio?.personality && {
      title: t('bio.traits'),
      body:
        bio.personality.length === 1 ? (
          renderObsidianBody(bio.personality[0])
        ) : (
          // A bullet column of its own: each trait renders as a paragraph, which `list-inside` would
          // push below its marker.
          <ul className="space-y-1.5">
            {bio.personality.map((trait) => (
              <li key={trait} className="flex gap-2">
                <span aria-hidden className="mt-[0.55em] size-1 shrink-0 rounded-full bg-trim/60" />
                <div className="min-w-0">{renderObsidianBody(trait)}</div>
              </li>
            ))}
          </ul>
        ),
    },
    bio?.ideals && { title: t('bio.ideals'), body: renderObsidianBody(bio.ideals) },
    bio?.bonds && { title: t('bio.bonds'), body: renderObsidianBody(bio.bonds) },
    bio?.flaws && { title: t('bio.flaws'), body: renderObsidianBody(bio.flaws) },
  ].filter((p): p is { title: string; body: ReactNode } => Boolean(p))

  const facts = [
    { label: t('bio.class'), value: classSummary(c) },
    { label: t('stats.level'), value: totalCharacterLevel(c) },
    { label: t('bio.species'), value: c.species },
    { label: t('bio.background'), value: c.background },
    { label: t('bio.alignment'), value: c.alignment },
    ...(c.experience > 0 ? [{ label: t('bio.experience'), value: t('bio.experienceValue', { xp: c.experience.toLocaleString() }) }] : []),
  ].filter((row) => row.value !== '' && row.value !== 'Unknown')

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="space-y-4">
        <Card title={t('bio.profile')}>
          {c.portrait_url && (
            <img
              src={c.portrait_url}
              alt=""
              className="mx-auto mb-4 aspect-square w-full max-w-60 rounded-lg border-2 border-trim object-cover shadow-[0_0_0_3px_var(--color-surface),0_0_26px_-8px_var(--color-trim)]"
            />
          )}
          <Facts rows={facts} />
        </Card>
        {(bio?.appearance || bio?.appearance_text) && (
          <Card title={t('bio.appearance')}>
            {bio.appearance ? (
              <Facts
                rows={bio.appearance.map(({ key, value }) => ({
                  label: key in APPEARANCE_LABEL ? t(APPEARANCE_LABEL[key as AppearanceKey]) : key,
                  value,
                }))}
              />
            ) : (
              <div className="text-sm leading-relaxed text-fg/90">{renderObsidianBody(bio.appearance_text)}</div>
            )}
          </Card>
        )}
      </div>

      <div className="space-y-4">
        {rendered && (
          <Card title={t('bio.story')}>
            <div className="max-w-prose text-[0.95rem] leading-relaxed text-fg/90 [overflow-wrap:anywhere]">{rendered}</div>
          </Card>
        )}
        {prompts.length > 0 && (
          <Card title={t('bio.personality')}>
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {prompts.map((p) => (
                <Prompt key={p.title} title={p.title}>
                  {p.body}
                </Prompt>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
