import { Card } from '../../../components/Card'
import { D20RollButton } from '../../../dice/RollButton'
import { formatModifier, initiativeBonus } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'

function Stat({ label, value, rollModifier }: { label: string; value: string; rollModifier?: number }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-surface-2 px-2 py-3 text-center">
      {rollModifier !== undefined ? (
        <D20RollButton label={label} modifier={rollModifier} className="text-xl font-bold text-fg">
          {value}
        </D20RollButton>
      ) : (
        <span className="text-xl font-bold text-fg">{value}</span>
      )}
      <span className="mt-0.5 text-xs uppercase text-fg-muted">{label}</span>
    </div>
  )
}

export function CombatStats({ character }: { character: CharacterFrontmatter }) {
  return (
    <Card title="Combat">
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Prof. Bonus" value={formatModifier(character.proficiency_bonus)} />
        <Stat label="Initiative" value={formatModifier(initiativeBonus(character))} rollModifier={initiativeBonus(character)} />
        <Stat label="Armor Class" value={String(character.armor_class)} />
        <Stat label="Speed" value={character.speed} />
      </div>
    </Card>
  )
}
