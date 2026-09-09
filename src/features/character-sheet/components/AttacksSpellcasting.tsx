import { Card } from '../../../components/Card'
import { spellAttackBonus, spellSaveDC, formatModifier } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'
import type { VaultIndex } from '../../../vault/wikilinks'
import { resolveSpellLink } from '../../../vault/wikilinks'

export function AttacksSpellcasting({ character, index }: { character: CharacterFrontmatter; index: VaultIndex }) {
  if (!character.spellcasting) return null

  const dc = spellSaveDC(character)
  const attack = spellAttackBonus(character)
  const cantrips = (character.spells_known ?? [])
    .map((link) => resolveSpellLink(index, link))
    .filter((s) => s?.frontmatter.level === 0)

  return (
    <Card title="Attacks &amp; Spellcasting">
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
          <div className="text-xs uppercase text-fg-muted">Ability</div>
          <div className="font-semibold uppercase text-fg">{character.spellcasting.ability}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
          <div className="text-xs uppercase text-fg-muted">Save DC</div>
          <div className="font-semibold text-fg">{dc}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 px-2 py-2">
          <div className="text-xs uppercase text-fg-muted">Attack</div>
          <div className="font-semibold text-fg">{attack !== undefined ? formatModifier(attack) : '—'}</div>
        </div>
      </div>
      {cantrips.length > 0 && (
        <ul className="space-y-1 text-sm text-fg">
          {cantrips.map((c) => (
            <li key={c!.path} className="flex justify-between">
              <span>{c!.frontmatter.name}</span>
              <span className="text-fg-muted">{c!.frontmatter.range}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
