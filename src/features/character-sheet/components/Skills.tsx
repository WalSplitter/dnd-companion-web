import { Card } from '../../../components/Card'
import { D20RollButton } from '../../../dice/RollButton'
import { formatModifier, skillBonus, skillProficiencyLevel } from '../../../vault/deriveStats'
import { SKILLS, type CharacterFrontmatter } from '../../../vault/types'
import { ProficiencyDot } from './ProficiencyDot'

export function Skills({ character }: { character: CharacterFrontmatter }) {
  return (
    <Card title="Skills">
      <ul className="space-y-1.5">
        {SKILLS.map(({ key, label, ability }) => {
          const bonus = skillBonus(character, key)
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <ProficiencyDot level={skillProficiencyLevel(character, key)} />
              <span className="w-8 font-semibold text-fg">{formatModifier(bonus)}</span>
              <span className="text-fg-muted">{label}</span>
              <span className="ml-auto flex items-center gap-2">
                <span className="text-xs uppercase text-fg-muted/70">{ability}</span>
                <D20RollButton label={label} modifier={bonus} />
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
