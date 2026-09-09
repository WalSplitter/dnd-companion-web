import { Card } from '../../../components/Card'
import { formatModifier, skillBonus, skillProficiencyLevel } from '../../../vault/deriveStats'
import { SKILLS, type CharacterFrontmatter } from '../../../vault/types'
import { ProficiencyDot } from './ProficiencyDot'

export function Skills({ character }: { character: CharacterFrontmatter }) {
  return (
    <Card title="Skills">
      <ul className="space-y-1.5">
        {SKILLS.map(({ key, label, ability }) => (
          <li key={key} className="flex items-center gap-2 text-sm">
            <ProficiencyDot level={skillProficiencyLevel(character, key)} />
            <span className="w-8 font-semibold text-fg">{formatModifier(skillBonus(character, key))}</span>
            <span className="text-fg-muted">{label}</span>
            <span className="ml-auto text-xs uppercase text-fg-muted/70">{ability}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
