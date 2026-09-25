import { looksLikeEndeavourItem, normalizeEndeavourItem } from './adapters/endeavourItem'
import { looksLikeLegacyCharacter, normalizeLegacyCharacter } from './adapters/legacyCharacterSheet'
import { looksLikeLegacySpellNote, normalizeLegacySpellNote } from './adapters/legacySpell'
import { normalizeNativeCharacter } from './adapters/nativeCharacter'
import { parseRawFile, type RawFile } from './rawFile'
import type { ItemFrontmatter, SpellFrontmatter, Vault, VaultSourceFile } from './types'
import type { ImageAssets } from './vaultLoader'

export class FrontmatterValidationError extends Error {
  readonly path: string

  constructor(path: string, reason: string) {
    super(`${path}: ${reason}`)
    this.name = 'FrontmatterValidationError'
    this.path = path
  }
}

const NATIVE_TYPES = new Set(['character', 'item', 'spell'])

function assertName(raw: RawFile): void {
  if (typeof raw.data.name !== 'string' || raw.data.name.length === 0) {
    throw new FrontmatterValidationError(raw.path, 'missing required string field "name"')
  }
}

// Files under a path containing "vorlage" (German for "template") are the vault's blank
// character-sheet templates, not real characters — skip them even though they structurally
// match the legacy character format.
function isTemplateFile(raw: RawFile): boolean {
  return /vorlage/i.test(raw.path)
}

/**
 * Parses all source files and buckets them into a `Vault`. Each file goes to the first shape it matches:
 *  1. the app's own `type: character|item|spell` marker (`adapters/nativeCharacter.ts` for characters)
 *  2. an older campaign vault's character / spell notes, detected structurally
 *     (`adapters/legacyCharacterSheet.ts`, `adapters/legacySpell.ts`)
 *  3. "Endeavour" item notes, detected by their `Gegenstand/...` tags (`adapters/endeavourItem.ts`),
 *     kept in their own `vault.endeavourItems` collection — see that module for why
 *  4. anything else (rule pages, class/feature lore, ...) as a plain note, so a `[[Wikilink]]`
 *     pointing at it still resolves to something in the UI.
 * Adapters get the full list of parsed files, since characters pull data from linked notes.
 */
export function buildVault(files: VaultSourceFile[], imageAssets?: ImageAssets): Vault {
  const vault: Vault = { characters: [], items: [], spells: [], notes: [], endeavourItems: [] }
  const rawFiles = files.filter((f) => f.path.toLowerCase().endsWith('.md')).map(parseRawFile)

  for (const raw of rawFiles) {
    const { path, body, data } = raw
    const type = typeof data.type === 'string' ? data.type : undefined

    if (type && NATIVE_TYPES.has(type)) {
      assertName(raw)
      if (type === 'character') vault.characters.push({ path, body, frontmatter: normalizeNativeCharacter(raw, rawFiles, imageAssets) })
      else if (type === 'item') vault.items.push({ path, body, frontmatter: data as unknown as ItemFrontmatter })
      else vault.spells.push({ path, body, frontmatter: data as unknown as SpellFrontmatter })
    } else if (!isTemplateFile(raw) && looksLikeLegacyCharacter(data)) {
      vault.characters.push({ path, body, frontmatter: normalizeLegacyCharacter(raw, rawFiles, imageAssets) })
    } else if (looksLikeLegacySpellNote(data)) {
      // Kept raw — the UI renders every body through `renderObsidianBody`, which strips
      // Obsidian-only syntax and turns wikilinks into clickable links.
      vault.spells.push({ path, body, frontmatter: normalizeLegacySpellNote(raw) })
    } else if (looksLikeEndeavourItem(data)) {
      vault.endeavourItems.push({ path, body, frontmatter: normalizeEndeavourItem(raw) })
    } else {
      vault.notes.push({ path, name: raw.name, body })
    }
  }

  return vault
}
