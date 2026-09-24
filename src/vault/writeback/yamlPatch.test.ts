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

describe('patchFrontmatterField with createIfMissing', () => {
  const ownSchema = `---
name: Dummy
hp:
  current: 3
  max: 10
hit_dice:
  die: d8
  total: 1
---

Body.
`

  it('adds a missing optional leaf as the last child of its parent block', () => {
    const patched = patchFrontmatterField(ownSchema, ['hp', 'temp'], 4, { createIfMissing: true })
    expect(patched).toBe(ownSchema.replace('  max: 10\n', '  max: 10\n  temp: 4\n'))
    expect(load(patched.split('---')[1])).toMatchObject({ hp: { current: 3, max: 10, temp: 4 } })
  })

  it('patches the existing line instead of adding a duplicate when the key is there', () => {
    const once = patchFrontmatterField(ownSchema, ['hp', 'temp'], 4, { createIfMissing: true })
    const twice = patchFrontmatterField(once, ['hp', 'temp'], 7, { createIfMissing: true })
    expect(twice).toBe(ownSchema.replace('  max: 10\n', '  max: 10\n  temp: 7\n'))
  })

  it('keeps CRLF line endings when adding a key', () => {
    const crlf = ownSchema.replace(/\n/g, '\r\n')
    const patched = patchFrontmatterField(crlf, ['hit_dice', 'used'], 1, { createIfMissing: true })
    expect(patched).toBe(crlf.replace('  total: 1\r\n', '  total: 1\r\n  used: 1\r\n'))
  })

  it('still throws when the parent is missing or a flow map', () => {
    expect(() => patchFrontmatterField(ownSchema, ['nope', 'temp'], 1, { createIfMissing: true })).toThrow(YamlPatchError)
    const flow = ownSchema.replace('hp:\n  current: 3\n  max: 10', 'hp: { current: 3, max: 10 }')
    expect(() => patchFrontmatterField(flow, ['hp', 'temp'], 1, { createIfMissing: true })).toThrow(YamlPatchError)
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

describe('patchFrontmatterBlock: flow-style currency', () => {
  it('rewrites a one-line flow map as a one-line flow map and leaves the rest untouched', () => {
    const src = '---\nCharakter: "[[Dummy]]"\ncurrency: { cp: 12, sp: 8, ep: 0, gp: 30, pp: 1 }\n---\n\nBody\n'
    const out = patchFrontmatterBlock(src, ['currency'], { cp: 12, sp: 8, ep: 0, gp: 31, pp: 1 }, 1)
    expect(out).toBe('---\nCharakter: "[[Dummy]]"\ncurrency: {cp: 12, sp: 8, ep: 0, gp: 31, pp: 1}\n---\n\nBody\n')
  })
})
