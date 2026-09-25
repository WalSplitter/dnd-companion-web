import { Card } from '../../../components/Card'
import { D20Modifier } from '../../../components/ExhaustedValue'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'
import { useCanEdit, useVaultStore } from '../../../store/vaultStore'
import { isSavingThrowProficient, nimbleAttributeValue, savingThrowBonus } from '../../../vault/deriveStats'
import { ABILITIES, NIMBLE_SAVE_ATTRIBUTES, type CharacterFrontmatter } from '../../../vault/types'
import { ProficiencyDot } from './ProficiencyDot'

/** Nimble saving throws have no proficiency system at all — every save is just `W20 + Attributswert`
 * for whichever of the six save-backed attributes applies (see `NIMBLE_SAVE_ATTRIBUTES`). */
function NimbleSavingThrowsList({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  return (
    <ul className="space-y-0.5">
      {NIMBLE_SAVE_ATTRIBUTES.map((key) => {
        const label = t(`nimbleAttribute.${key}`)
        const bonus = nimbleAttributeValue(character, key)
        return (
          <li key={key} className="flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition hover:bg-trim/10">
            <D20Modifier value={bonus} className="w-8 text-right font-num text-fg" />
            <span className="text-fg-muted">{label}</span>
            <D20RollButton
              label={t('roll.saveSuffix', { label })}
              modifier={bonus}
              className="ml-auto rounded-md border border-trim/30 bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-fg-muted transition hover:border-trim hover:text-trim"
            />
          </li>
        )
      })}
    </ul>
  )
}

export function SavingThrows({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const canEdit = useCanEdit()
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)

  if (character.nimble_attributes) {
    return (
      <Card title={t('cards.savingThrows')}>
        <NimbleSavingThrowsList character={character} />
      </Card>
    )
  }

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
              <D20Modifier value={bonus} className={`w-8 text-right font-num ${proficient ? 'text-trim' : 'text-fg'}`} />
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
