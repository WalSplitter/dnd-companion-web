import { describe, expect, it } from 'vitest'
import { buildChronicle } from '../features/character-list/chronicle'
import { buildVaultFromRawFiles, parseVaultFiles } from '../vault/parseFrontmatter'
import { sampleChronicleCommits } from './chronicle'
import { sampleVaultFiles } from './index'

describe('sample chronicle', () => {
  const sessions = buildChronicle(sampleChronicleCommits(new Date('2026-10-24T12:00:00')))

  it('reads back as two game nights of app commits, nothing edited by hand', () => {
    expect(sessions).toHaveLength(2)
    expect(sessions.every((s) => s.manual.length === 0)).toBe(true)
  })

  it('ends the latest night on the values the sample sheets hold', () => {
    const vault = buildVaultFromRawFiles(parseVaultFiles(sampleVaultFiles))
    const sheet = (name: string) => vault.characters.find((c) => c.frontmatter.name === name)!.frontmatter
    const value: Record<string, (name: string) => unknown> = {
      'hp.current': (n) => sheet(n).hp.current,
      'resilience.current': (n) => sheet(n).resilience?.current,
      'conditions.exhaustion': (n) => sheet(n).conditions?.exhaustion,
      'spellcasting.mana.current': (n) => sheet(n).spellcasting?.mana?.current,
      'resources.ki': (n) => sheet(n).class_resources?.find((r) => r.key === 'ki')?.current,
    }
    for (const character of sessions[0].characters) {
      for (const change of character.changes) {
        if (change.kind !== 'set') continue
        expect(String(value[change.key](character.name)), `${character.name} ${change.key}`).toBe(change.to)
      }
    }
  })
})
