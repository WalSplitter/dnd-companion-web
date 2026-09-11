import type { CharacterFrontmatter, ItemFrontmatter, SpellFrontmatter, Vault, VaultFile, VaultNote } from './types'

const WIKILINK_RE = /^\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]$/

/** Obsidian occasionally stores a vault-relative full path instead of a bare filename (to
 * disambiguate two files sharing a basename elsewhere in the vault) — e.g. a self-referencing link
 * inside `Dunkelsicht.md` reading `[[_DnD_PFT/Regeln/.../Dunkelsicht]]` with no alias. Every file in
 * this app is indexed by basename only, so both lookups and display text need just the last path
 * segment, same as Obsidian shows when a link carries no alias. */
export function basename(target: string): string {
  const last = target.split('/').pop() ?? target
  return last.replace(/\.md$/i, '').trim()
}

/** Strips `[[...]]` wrapping and an optional `|alias`, returning the target's bare filename. */
export function wikilinkTarget(raw: string): string {
  const match = WIKILINK_RE.exec(raw.trim())
  return basename(match ? match[1] : raw.trim())
}

export interface VaultIndex {
  charactersByName: Map<string, VaultFile<CharacterFrontmatter>>
  itemsByName: Map<string, VaultFile<ItemFrontmatter>>
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

  const spellsByName = new Map<string, VaultFile<SpellFrontmatter>>()
  for (const spell of vault.spells) spellsByName.set(normalize(spell.frontmatter.name), spell)

  const notesByName = new Map<string, VaultNote>()
  for (const note of vault.notes) notesByName.set(normalize(note.name), note)

  return { charactersByName, itemsByName, spellsByName, notesByName }
}

export function resolveCharacterLink(index: VaultIndex, link: string): VaultFile<CharacterFrontmatter> | undefined {
  return index.charactersByName.get(normalize(wikilinkTarget(link)))
}

export function resolveItemLink(index: VaultIndex, link: string): VaultFile<ItemFrontmatter> | undefined {
  return index.itemsByName.get(normalize(wikilinkTarget(link)))
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
}

/** Resolves a wikilink target against every known vault collection, in the order a reader would
 * expect to find it (a character sheet first, then items/spells, then a generic rule/lore note). */
export function resolveWikilink(index: VaultIndex, link: string): ResolvedWikilink {
  const target = wikilinkTarget(link)

  const character = resolveCharacterLink(index, target)
  if (character) {
    return { kind: 'character', name: character.frontmatter.name, path: character.path, body: character.body }
  }

  const item = resolveItemLink(index, target)
  if (item) {
    return { kind: 'item', name: item.frontmatter.name, path: item.path, body: item.body, summary: item.frontmatter.category }
  }

  const spell = resolveSpellLink(index, target)
  if (spell) {
    return {
      kind: 'spell',
      name: spell.frontmatter.name,
      path: spell.path,
      body: spell.body,
      summary: `${spell.frontmatter.level === 0 ? 'Cantrip' : `Level ${spell.frontmatter.level}`} · ${spell.frontmatter.school}`,
    }
  }

  const note = resolveNoteLink(index, target)
  if (note) {
    return { kind: 'note', name: note.name, path: note.path, body: note.body }
  }

  return { kind: 'unresolved', name: target }
}
