import { Card } from '../../../components/Card'
import { formatModifier, isSavingThrowProficient, savingThrowBonus } from '../../../vault/deriveStats'
import { ABILITIES, type CharacterFrontmatter } from '../../../vault/types'
import { ProficiencyDot } from './ProficiencyDot'

export function SavingThrows({ character }: { character: CharacterFrontmatter }) {
  return (
    <Card title="Saving Throws">
      <ul className="space-y-1.5">
        {ABILITIES.map(({ key, label }) => {
          const proficient = isSavingThrowProficient(character, key)
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <ProficiencyDot active={proficient} />
              <span className="w-8 font-semibold text-fg">{formatModifier(savingThrowBonus(character, key))}</span>
              <span className="text-fg-muted">{label}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
