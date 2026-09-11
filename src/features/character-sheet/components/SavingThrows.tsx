import { Card } from '../../../components/Card'
import { D20RollButton } from '../../../dice/RollButton'
import { formatModifier, isSavingThrowProficient, savingThrowBonus } from '../../../vault/deriveStats'
import { ABILITIES, type CharacterFrontmatter } from '../../../vault/types'
import { ProficiencyDot } from './ProficiencyDot'

export function SavingThrows({ character }: { character: CharacterFrontmatter }) {
  return (
    <Card title="Saving Throws">
      <ul className="space-y-1.5">
        {ABILITIES.map(({ key, label }) => {
          const proficient = isSavingThrowProficient(character, key)
          const bonus = savingThrowBonus(character, key)
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <ProficiencyDot active={proficient} />
              <span className="w-8 font-semibold text-fg">{formatModifier(bonus)}</span>
              <span className="text-fg-muted">{label}</span>
              <D20RollButton label={`${label} save`} modifier={bonus} className="ml-auto rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-fg-muted transition hover:border-primary hover:text-primary" />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
