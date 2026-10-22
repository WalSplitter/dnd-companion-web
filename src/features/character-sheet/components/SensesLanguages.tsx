import { Card } from '../../../components/Card'
import { PassivePerceptionValue } from '../../../components/ExhaustedValue'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import { useVaultIndex } from '../../../components/obsidian/useVaultIndex'
import { WikiLink } from '../../../components/obsidian/WikiLink'
import { languageAllowance } from '../../../rules/endeavour'
import type { CharacterFrontmatter } from '../../../vault/types'
import { resolveWikilink } from '../../../vault/wikilinks'
import { linkDisplay, linkFile } from '../../../vault/wikilinkSyntax'

/** Senses, languages (linked to their notes where the vault has them, with Endeavour's language
 * allowance) and the class's weapon/armor training. */
export function SensesLanguages({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const index = useVaultIndex()
  const allowance = languageAllowance(character)
  const senses = character.senses ?? {}
  const senseEntries = Object.entries(senses).filter(([, v]) => v)

  return (
    <Card title={t('cards.sensesLanguages')}>
      <dl className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-fg-muted">{t('stats.passivePerception')}</dt>
          <dd className="rpg-plate min-w-9 px-2 py-0.5 text-center font-num text-fg">
            <PassivePerceptionValue character={character} />
          </dd>
        </div>
        {senseEntries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <dt className="capitalize text-fg-muted">{t(`senses.${key}` as TranslationKey)}</dt>
            <dd className="rpg-plate px-2 py-0.5 text-center font-num text-fg">{value}</dd>
          </div>
        ))}
        {character.languages && character.languages.length > 0 && (
          <div className="border-t border-trim/20 pt-2.5">
            <dt className="flex items-baseline justify-between gap-2 text-fg-muted">
              {t('stats.languages')}
              {allowance !== undefined && (
                // Neutral, not a warning: an ancestry may grant languages of its own (the vault has no
                // ancestry notes yet to say so).
                <span className="font-num text-xs" title={t('stats.languageAllowanceHint', { count: allowance })}>
                  {character.languages.length} / {allowance}
                </span>
              )}
            </dt>
            <dd className="mt-1 text-fg">
              {character.languages.map((language, i) => {
                const name = linkDisplay(language) || language
                const target = linkFile(language) || language
                const linked = resolveWikilink(index, target).kind !== 'unresolved'
                return (
                  <span key={`${name}-${i}`}>
                    {i > 0 && ', '}
                    {linked ? <WikiLink target={target} display={name} /> : name}
                  </span>
                )
              })}
            </dd>
          </div>
        )}
        {character.class_proficiencies?.weapons.length ? (
          <div className="border-t border-trim/20 pt-2.5">
            <dt className="text-fg-muted">{t('stats.weaponTraining')}</dt>
            <dd className="mt-1 text-fg">{character.class_proficiencies.weapons.join(', ')}</dd>
          </div>
        ) : null}
        {character.class_proficiencies?.armor.length ? (
          <div className="border-t border-trim/20 pt-2.5">
            <dt className="text-fg-muted">{t('stats.armorTraining')}</dt>
            <dd className="mt-1 text-fg">{character.class_proficiencies.armor.join(', ')}</dd>
          </div>
        ) : null}
        {character.tool_proficiencies && character.tool_proficiencies.length > 0 && (
          <div className="border-t border-trim/20 pt-2.5">
            <dt className="text-fg-muted">{t('stats.tools')}</dt>
            <dd className="mt-1 text-fg">{character.tool_proficiencies.join(', ')}</dd>
          </div>
        )}
      </dl>
    </Card>
  )
}
