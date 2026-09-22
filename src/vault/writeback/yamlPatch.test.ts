import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { patchFrontmatterBlock, patchFrontmatterField, YamlPatchError } from './yamlPatch'

const fixture = `---
Stufe: 6
Gesundheit:
  MaxTP: 47
  TP: 17
  TW: 6
  TempTP: 0
InputData:
  GlücksPunkt1: false
  GlücksPunkt2: false
  GlücksPunkt3: false
  ErschöpfungsPunkte: 2
  Zauberplätze:
    Grad_1: 2
    Grad_2: 0
sonstigeZustaende: ""
---

# Ar'go
Some body text.

\`\`\`meta-bind-button
label: Kurze Rast
id: shortBreakButton
\`\`\`
`

describe('patchFrontmatterField', () => {
  it('replaces a nested scalar by its exact dotted path, leaving everything else untouched', () => {
    const patched = patchFrontmatterField(fixture, ['Gesundheit', 'TP'], 25)
    expect(patched).toContain('  TP: 25')
    expect(patched).not.toContain('  TP: 17')
    // Nothing else in the frontmatter or body changed.
    expect(patched.replace('  TP: 25', '  TP: 17')).toBe(fixture)
  })

  it('resolves a deeply nested boolean under InputData without touching sibling GlücksPunkt keys', () => {
    const patched = patchFrontmatterField(fixture, ['InputData', 'GlücksPunkt2'], true)
    expect(patched).toContain('  GlücksPunkt1: false')
    expect(patched).toContain('  GlücksPunkt2: true')
    expect(patched).toContain('  GlücksPunkt3: false')
  })

  it('writes a number field', () => {
    const patched = patchFrontmatterField(fixture, ['InputData', 'ErschöpfungsPunkte'], 4)
    expect(patched).toContain('  ErschöpfungsPunkte: 4')
  })

  it('does not confuse a top-level key with a same-named nested key', () => {
    const withTopLevelDuplicate = fixture.replace('Stufe: 6', 'Stufe: 6\nZauberplätze:\n  Grad_1: 9')
    const patched = patchFrontmatterField(withTopLevelDuplicate, ['InputData', 'Zauberplätze', 'Grad_1'], 3)
    expect(patched).toContain('    Grad_1: 3')
    expect(patched).toContain('  Grad_1: 9') // the unrelated top-level Zauberplätze.Grad_1 is untouched
  })

  it('leaves the non-frontmatter body byte-identical, including code fences', () => {
    const patched = patchFrontmatterField(fixture, ['Stufe'], 7)
    const bodyStart = patched.indexOf("\n\n# Ar'go")
    expect(patched.slice(bodyStart)).toBe(fixture.slice(fixture.indexOf("\n\n# Ar'go")))
  })

  it('throws and changes nothing when the key path does not exist', () => {
    expect(() => patchFrontmatterField(fixture, ['InputData', 'DoesNotExist'], 1)).toThrow(YamlPatchError)
  })

  it('throws when there is no frontmatter block at all', () => {
    expect(() => patchFrontmatterField('# Just a note\nNo frontmatter here.', ['Stufe'], 1)).toThrow(YamlPatchError)
  })
})

// Matches the real Endeavour vault's `Inventar <Name>.md` shape (Charakter-linked backpack/pouch
// notes — see `EndeavourInventoryGrid.tsx`).
const inventoryFixture = `---
Charakter: "[[Dummy]]"
endeavour_inventory:
  containers:
    - container: "[[Rucksack (Groß)]]"
      items:
        - "[[Schaufel]]"
        - "[[Blendlaterne]]"
        - "[[Kurzschwert]]"
        - name: Seltsamer Schlüssel
          plaetze: 1
    - container: "[[Gürteltasche]]"
      items:
        - "[[Köcher]]"
currency: { cp: 12, sp: 8, ep: 0, gp: 30, pp: 1 }
---

Inventar zu [[Dummy]].
`

describe('patchFrontmatterBlock', () => {
  it('round-trips a placed stack entry (wikilink + charges) into the containers array', () => {
    const containers = [
      { container: '[[Rucksack (Groß)]]', items: ['[[Schaufel]]', { link: '[[Fackel]]', charges: 2 }] },
      { container: '[[Gürteltasche]]', items: ['[[Köcher]]'] },
    ]
    const patched = patchFrontmatterBlock(inventoryFixture, ['endeavour_inventory', 'containers'], containers)

    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(patched)
    expect(match).toBeTruthy()
    const parsed = load(match![1]) as Record<string, unknown>
    expect(parsed.endeavour_inventory).toEqual({ containers })
  })

  it('leaves sibling keys, other frontmatter, and the body untouched', () => {
    const patched = patchFrontmatterBlock(
      inventoryFixture,
      ['endeavour_inventory', 'containers'],
      [{ container: '[[Rucksack (Groß)]]', items: [] }],
    )
    expect(patched).toContain('Charakter: "[[Dummy]]"')
    expect(patched).toContain('currency: { cp: 12, sp: 8, ep: 0, gp: 30, pp: 1 }')
    expect(patched.endsWith('\nInventar zu [[Dummy]].\n')).toBe(true)
  })

  it('throws and changes nothing when the key path does not exist', () => {
    expect(() => patchFrontmatterBlock(inventoryFixture, ['does_not_exist'], [])).toThrow(YamlPatchError)
  })
})
