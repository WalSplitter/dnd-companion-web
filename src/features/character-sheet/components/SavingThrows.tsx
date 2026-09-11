import { Card } from '../../../components/Card'
import { D20RollButton } from '../../../dice/RollButton'
import { useVaultStore } from '../../../store/vaultStore'
import { formatModifier, isSavingThrowProficient, savingThrowBonus } from '../../../vault/deriveStats'
import { ABILITIES, type CharacterFrontmatter } from '../../../vault/types'
import { ProficiencyDot } from './ProficiencyDot'

export function SavingThrows({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted'

  return (
    <Card title="Saving Throws">
      <ul className="space-y-1.5">
        {ABILITIES.map(({ key, label }) => {
          const proficient = isSavingThrowProficient(character, key)
          const bonus = savingThrowBonus(character, key)
          const target = character._write?.saving_throw_proficiencies?.[key]
          const dot = <ProficiencyDot active={proficient} />
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              {canEdit && target ? (
                <button
                  type="button"
                  aria-label={`Toggle ${label} saving throw proficiency`}
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
              <span className="w-8 font-semibold text-fg">{formatModifier(bonus)}</span>
              <span className="text-fg-muted">{label}</span>
              <D20RollButton
                label={`${label} save`}
                modifier={bonus}
                className="ml-auto rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-fg-muted transition hover:border-primary hover:text-primary"
              />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
