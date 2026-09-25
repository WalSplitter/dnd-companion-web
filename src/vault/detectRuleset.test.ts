import { describe, expect, it } from 'vitest'
import { detectRuleset } from './detectRuleset'

function file(path: string, content: string) {
  return { path, content }
}

describe('detectRuleset', () => {
  it('returns unknown for an empty/unrecognized vault', () => {
    expect(detectRuleset([file('Notes/Readme.md', 'Just some prose.')]).ruleset).toBe('unknown')
  })

  it('detects the native schema as dnd5e_2024', () => {
    expect(detectRuleset([file('Characters/Elandra.md', '---\ntype: character\nname: Elandra\n---\n')]).ruleset).toBe('dnd5e_2024')
  })

  it('detects the legacy German character sheet as dnd5e', () => {
    const content = `---
Attribute: { Stärke: 10 }
Rettungswürfe: { Stärke: 1 }
Fertigkeiten: { Athletik: 1 }
Hintergrund: { Name: Ar'go }
---
`
    expect(detectRuleset([file("Characters/Ar'go.md", content)]).ruleset).toBe('dnd5e')
  })

  it('detects a Regeln/Endeavour tag as nimble', () => {
    const result = detectRuleset([file('Regeln/Inventar.md', '---\ntags: [Regeln/Endeavour/Inventar]\n---\n')])
    expect(result.ruleset).toBe('nimble')
    expect(result.evidence).toContain('tags: Regeln/Endeavour')
  })

  it('still detects the older Regeln/Nimble tag as nimble', () => {
    expect(detectRuleset([file('Regeln/Inventar.md', '---\ntags: [Regeln/Nimble]\n---\n')]).ruleset).toBe('nimble')
  })

  it('detects a mix of Nimble tags and legacy character fields as custom', () => {
    const character = `---
Attribute: { Stärke: 10 }
Rettungswürfe: { Stärke: 1 }
Fertigkeiten: { Athletik: 1 }
Hintergrund: { Name: Ar'go }
---
`
    const rule = '---\ntags: [Regeln/Nimble]\n---\n'
    expect(detectRuleset([file("Characters/Ar'go.md", character), file('Regeln/Inventar.md', rule)]).ruleset).toBe('custom')
  })

  it('ignores DM-private paths (segments starting with "_")', () => {
    const result = detectRuleset([file('zHidden/_Embeds/embed Gegenstand/embed Waffe.md', '---\ntags: [Regeln/Nimble]\n---\n')])
    expect(result.ruleset).toBe('unknown')
    expect(result.evidence).toEqual([])
  })
})
