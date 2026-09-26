import { describe, expect, it } from 'vitest'
import { resolveEntry } from '../features/inventory/grid'
import { detectRuleset } from '../vault/detectRuleset'
import { evasionValue, movementSquares } from '../vault/deriveStats'
import { buildVault } from '../vault/parseFrontmatter'
import { parseRawFile } from '../vault/rawFile'
import { buildVaultIndex, resolveSpellLink, resolveWikilink } from '../vault/wikilinks'
import { sampleVaultFiles, sampleVaultImages } from '.'

const vault = buildVault(sampleVaultFiles, sampleVaultImages)
const index = buildVaultIndex(vault)
const character = (name: string) => {
  const found = vault.characters.find((c) => c.frontmatter.name === name)
  if (!found) throw new Error(`sample character ${name} missing`)
  return found.frontmatter
}

/** Damage types are plain labels on the item notes, and `embed …` targets are Obsidian-only
 * transclusions from the real vault's hidden `_Embeds` folder — neither is expected to resolve. */
const INTENTIONALLY_UNRESOLVED = /^(embed |.*schaden$)/i

describe('sample vault', () => {
  it('parses as an Endeavour vault with two characters', () => {
    expect(vault.characters.map((c) => c.frontmatter.name).sort()).toEqual(['Borin Eisenfaust', 'Elandra Windrider'])
    expect(detectRuleset(sampleVaultFiles).ruleset).toBe('endeavour')
  })

  it('derives pools, primary attributes and evasion from the class and armor notes', () => {
    const elandra = character('Elandra Windrider')
    expect(elandra.hp.max).toBe(18)
    expect(elandra.resilience?.max).toBe(12)
    expect(elandra.nimble_primary_attributes).toEqual(['vs', 'en'])
    expect(evasionValue(elandra)).toBe(11)
    expect(movementSquares(elandra)).toBe(6)

    const borin = character('Borin Eisenfaust')
    expect(borin.hp.max).toBe(36)
    expect(borin.resilience?.max).toBe(16)
    expect(borin.nimble_primary_attributes).toEqual(['st', 'ko'])
    expect(borin.bw_cap).toBe(2)
    expect(evasionValue(borin)).toBe(12)
    // 7.5 m = 5 squares, minus 1 for exhaustion level 1.
    expect(movementSquares(borin)).toBe(4)
  })

  it('pulls inventory, currency and spells in from the linked sheets, with write targets', () => {
    const elandra = character('Elandra Windrider')
    expect(elandra.currency).toEqual({ cp: 40, sp: 15, gp: 42 })
    expect(elandra._write?.endeavour_inventory?.path).toMatch(/Inventar Elandra\.md$/)
    expect(elandra.spellcasting?.mana).toEqual({ current: 9, max: 12 })
    expect(elandra._write?.mana_current).toMatchObject({ path: expect.stringMatching(/Spell Sheet Elandra\.md$/), keyPath: ['spellcasting', 'mana', 'current'] })
    expect(elandra.spells_known?.every((link) => resolveSpellLink(index, link))).toBe(true)
  })

  it('resolves every inventory entry and container to an item note', () => {
    for (const { frontmatter } of vault.characters) {
      for (const container of frontmatter.endeavour_inventory?.containers ?? []) {
        expect(resolveWikilink(index, container.container).kind, container.container).toBe('item')
        for (const entry of container.items) expect(resolveEntry(index, entry), JSON.stringify(entry)).toBeDefined()
      }
    }
  })

  it('resolves portraits to bundled image URLs', () => {
    for (const { frontmatter } of vault.characters) expect(frontmatter.portrait_url, frontmatter.name).toBeTruthy()
  })

  it('has no dangling wikilinks', () => {
    const dangling = new Set<string>()
    for (const file of sampleVaultFiles) {
      const { body, data } = parseRawFile(file)
      const text = `${JSON.stringify(data)}\n${body}`
      for (const [, target] of text.matchAll(/!?\[\[([^\]|#]+)/g)) {
        if (INTENTIONALLY_UNRESOLVED.test(target) || /\.(svg|png|jpe?g|webp)$/i.test(target)) continue
        if (resolveWikilink(index, target).kind === 'unresolved') dangling.add(`${file.path} → ${target}`)
      }
    }
    expect([...dangling]).toEqual([])
  })
})
