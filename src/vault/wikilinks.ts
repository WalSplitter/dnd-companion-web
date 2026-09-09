import type { ItemFrontmatter, SpellFrontmatter, Vault, VaultFile } from './types'

const WIKILINK_RE = /^\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]$/

/** Strips `[[...]]` wrapping and an optional `|alias`, returning the raw target name. */
export function wikilinkTarget(raw: string): string {
  const match = WIKILINK_RE.exec(raw.trim())
  return match ? match[1].trim() : raw.trim()
}

export interface VaultIndex {
  itemsByName: Map<string, VaultFile<ItemFrontmatter>>
  spellsByName: Map<string, VaultFile<SpellFrontmatter>>
}

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

export function buildVaultIndex(vault: Vault): VaultIndex {
  const itemsByName = new Map<string, VaultFile<ItemFrontmatter>>()
  for (const item of vault.items) itemsByName.set(normalize(item.frontmatter.name), item)

  const spellsByName = new Map<string, VaultFile<SpellFrontmatter>>()
  for (const spell of vault.spells) spellsByName.set(normalize(spell.frontmatter.name), spell)

  return { itemsByName, spellsByName }
}

export function resolveItemLink(index: VaultIndex, link: string): VaultFile<ItemFrontmatter> | undefined {
  return index.itemsByName.get(normalize(wikilinkTarget(link)))
}

export function resolveSpellLink(index: VaultIndex, link: string): VaultFile<SpellFrontmatter> | undefined {
  return index.spellsByName.get(normalize(wikilinkTarget(link)))
}
