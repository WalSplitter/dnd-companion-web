import { endeavourItemSummary } from './adapters/endeavourItem'
import { wikilinkTarget } from './wikilinkSyntax'
import type { CharacterFrontmatter, EndeavourItemFrontmatter, ItemFrontmatter, SpellFrontmatter, Vault, VaultFile, VaultNote } from './types'

export interface VaultIndex {
  charactersByName: Map<string, VaultFile<CharacterFrontmatter>>
  itemsByName: Map<string, VaultFile<ItemFrontmatter>>
  /** Experimental "Endeavour" tag-scheme items — see `adapters/endeavourItem.ts`. */
  endeavourItemsByName: Map<string, VaultFile<EndeavourItemFrontmatter>>
  spellsByName: Map<string, VaultFile<SpellFrontmatter>>
  notesByName: Map<string, VaultNote>
}

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

export function buildVaultIndex(vault: Vault): VaultIndex {
  const charactersByName = new Map<string, VaultFile<CharacterFrontmatter>>()
  for (const character of vault.characters) charactersByName.set(normalize(character.frontmatter.name), character)

  const itemsByName = new Map<string, VaultFile<ItemFrontmatter>>()
  for (const item of vault.items) itemsByName.set(normalize(item.frontmatter.name), item)

  const endeavourItemsByName = new Map<string, VaultFile<EndeavourItemFrontmatter>>()
  for (const item of vault.endeavourItems) endeavourItemsByName.set(normalize(item.frontmatter.name), item)

  const spellsByName = new Map<string, VaultFile<SpellFrontmatter>>()
  for (const spell of vault.spells) spellsByName.set(normalize(spell.frontmatter.name), spell)

  const notesByName = new Map<string, VaultNote>()
  for (const note of vault.notes) notesByName.set(normalize(note.name), note)

  return { charactersByName, itemsByName, endeavourItemsByName, spellsByName, notesByName }
}

export function resolveCharacterLink(index: VaultIndex, link: string): VaultFile<CharacterFrontmatter> | undefined {
  return index.charactersByName.get(normalize(wikilinkTarget(link)))
}

export function resolveItemLink(index: VaultIndex, link: string): VaultFile<ItemFrontmatter> | undefined {
  return index.itemsByName.get(normalize(wikilinkTarget(link)))
}

/** Experimental "Endeavour" tag-scheme items — see `adapters/endeavourItem.ts`. Tried as a fallback
 * wherever a native `resolveItemLink` lookup comes up empty (see `entryWeight`/`ItemList.tsx`). */
export function resolveEndeavourItemLink(index: VaultIndex, link: string): VaultFile<EndeavourItemFrontmatter> | undefined {
  return index.endeavourItemsByName.get(normalize(wikilinkTarget(link)))
}

export function resolveSpellLink(index: VaultIndex, link: string): VaultFile<SpellFrontmatter> | undefined {
  return index.spellsByName.get(normalize(wikilinkTarget(link)))
}

export function resolveNoteLink(index: VaultIndex, link: string): VaultNote | undefined {
  return index.notesByName.get(normalize(wikilinkTarget(link)))
}

export type WikilinkTargetKind = 'character' | 'item' | 'spell' | 'note' | 'unresolved'

export interface ResolvedWikilink {
  kind: WikilinkTargetKind
  name: string
  path?: string
  body?: string
  summary?: string
  /** Spell grade (0 = cantrip), localized by the UI in front of `summary`. */
  spellLevel?: number
}

/** Resolves a wikilink target against every known vault collection, in the order a reader would
 * expect to find it (a character sheet first, then items/spells, then a generic rule/lore note). */
export function resolveWikilink(index: VaultIndex, link: string): ResolvedWikilink {
  const target = wikilinkTarget(link)

  const character = resolveCharacterLink(index, target)
  if (character) {
    return { kind: 'character', name: character.frontmatter.name, path: character.path, body: character.frontmatter.backstory ?? character.body }
  }

  const item = resolveItemLink(index, target)
  if (item) {
    return { kind: 'item', name: item.frontmatter.name, path: item.path, body: item.body, summary: item.frontmatter.category }
  }

  const endeavourItem = resolveEndeavourItemLink(index, target)
  if (endeavourItem) {
    return {
      kind: 'item',
      name: endeavourItem.frontmatter.name,
      path: endeavourItem.path,
      body: endeavourItem.body,
      summary: endeavourItemSummary(endeavourItem.frontmatter),
    }
  }

  const spell = resolveSpellLink(index, target)
  if (spell) {
    return {
      kind: 'spell',
      name: spell.frontmatter.name,
      path: spell.path,
      body: spell.body,
      summary: spell.frontmatter.school,
      spellLevel: spell.frontmatter.level,
    }
  }

  const note = resolveNoteLink(index, target)
  if (note) {
    return { kind: 'note', name: note.name, path: note.path, body: note.body }
  }

  return { kind: 'unresolved', name: target }
}
