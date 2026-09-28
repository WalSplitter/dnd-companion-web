import { Card } from '../../../components/Card'
import { PassivePerceptionValue } from '../../../components/ExhaustedValue'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import type { CharacterFrontmatter } from '../../../vault/types'

export function SensesLanguages({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
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
            <dt className="text-fg-muted">{t('stats.languages')}</dt>
            <dd className="mt-1 text-fg">{character.languages.join(', ')}</dd>
          </div>
        )}
        {character.nimble_class_proficiencies?.weapons.length ? (
          <div className="border-t border-trim/20 pt-2.5">
            <dt className="text-fg-muted">{t('stats.weaponTraining')}</dt>
            <dd className="mt-1 text-fg">{character.nimble_class_proficiencies.weapons.join(', ')}</dd>
          </div>
        ) : null}
        {character.nimble_class_proficiencies?.armor.length ? (
          <div className="border-t border-trim/20 pt-2.5">
            <dt className="text-fg-muted">{t('stats.armorTraining')}</dt>
            <dd className="mt-1 text-fg">{character.nimble_class_proficiencies.armor.join(', ')}</dd>
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
