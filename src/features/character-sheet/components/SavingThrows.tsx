import { Card } from '../../../components/Card'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/I18nContext'
import { useVaultStore } from '../../../store/vaultStore'
import { formatModifier, isSavingThrowProficient, savingThrowBonus } from '../../../vault/deriveStats'
import { ABILITIES, type CharacterFrontmatter } from '../../../vault/types'
import { ProficiencyDot } from './ProficiencyDot'

export function SavingThrows({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted'

  return (
    <Card title={t('cards.savingThrows')}>
      <ul className="space-y-0.5">
        {ABILITIES.map(({ key }) => {
          const label = t(`ability.${key}`)
          const proficient = isSavingThrowProficient(character, key)
          const bonus = savingThrowBonus(character, key)
          const target = character._write?.saving_throw_proficiencies?.[key]
          const dot = <ProficiencyDot active={proficient} />
          return (
            <li
              key={key}
              className={`flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition hover:bg-trim/10 ${proficient ? 'bg-trim/[0.06]' : ''}`}
            >
              {canEdit && target ? (
                <button
                  type="button"
                  aria-label={t('a11y.toggleSavingThrow', { label })}
                  onClick={() => {
                    const next = !proficient
                    void updateCharacterField(characterPath, target, next ? 1 : 0, (c) => ({
                      ...c,
                      saving_throw_proficiencies: next
                        ? [...c.saving_throw_proficiencies.filter((k) => k !== key), key]
                        : c.saving_throw_proficiencies.filter((k) => k !== key),
                    }))
                  }}
                  className="cursor-pointer transition hover:opacity-70"
                >
                  {dot}
                </button>
              ) : (
                dot
              )}
              <span className={`w-8 text-right font-num ${proficient ? 'text-trim' : 'text-fg'}`}>{formatModifier(bonus)}</span>
              <span className={proficient ? 'text-fg' : 'text-fg-muted'}>{label}</span>
              <D20RollButton
                label={t('roll.saveSuffix', { label })}
                modifier={bonus}
                className="ml-auto rounded-md border border-trim/30 bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-fg-muted transition hover:border-trim hover:text-trim"
              />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
