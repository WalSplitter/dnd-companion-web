import { looksLikeLegacyCharacter, normalizeLegacyCharacter } from './adapters/legacyCharacterSheet'
import { parseRawFile, type RawFile } from './rawFile'
import type { Vault, VaultFile, VaultFrontmatter, VaultSourceFile } from './types'

export class FrontmatterValidationError extends Error {
  readonly path: string

  constructor(path: string, reason: string) {
    super(`${path}: ${reason}`)
    this.name = 'FrontmatterValidationError'
    this.path = path
  }
}

function assertString(value: unknown, field: string, path: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new FrontmatterValidationError(path, `missing required string field "${field}"`)
  }
}

/** Parses a single vault source file into typed frontmatter + markdown body, or `null` if it has no recognized `type`. */
export function parseVaultFile(file: VaultSourceFile): VaultFile<VaultFrontmatter> | null {
  const { data, body } = parseRawFile(file)
  const type = data.type as string | undefined
  if (type !== 'character' && type !== 'item' && type !== 'spell') return null

  assertString(data.name, 'name', file.path)

  return {
    path: file.path,
    frontmatter: data as unknown as VaultFrontmatter,
    body,
  }
}

// Files under a path containing "vorlage" (German for "template") are the vault's blank
// character-sheet templates, not real characters — skip them even though they structurally
// match the legacy character format.
function isTemplateFile(raw: RawFile): boolean {
  return /vorlage/i.test(raw.path)
}

/**
 * Parses all source files and buckets them by type. Two character formats are recognized:
 *  - the app's own `type: character` frontmatter (see `types.ts`)
 *  - an existing campaign vault's schema with no `type:` marker, detected structurally and
 *    normalized by `adapters/legacyCharacterSheet.ts`
 * Files matching neither, and non-character files with no recognized `type`, are skipped.
 */
export function buildVault(files: VaultSourceFile[]): Vault {
  const vault: Vault = { characters: [], items: [], spells: [] }
  const rawFiles = files.filter((f) => f.path.toLowerCase().endsWith('.md')).map(parseRawFile)

  for (const raw of rawFiles) {
    const type = raw.data.type as string | undefined

    if (type === 'character' || type === 'item' || type === 'spell') {
      assertString(raw.data.name, 'name', raw.path)
      const parsed: VaultFile<VaultFrontmatter> = {
        path: raw.path,
        frontmatter: raw.data as unknown as VaultFrontmatter,
        body: raw.body,
      }
      if (type === 'character') vault.characters.push(parsed as VaultFile<Extract<VaultFrontmatter, { type: 'character' }>>)
      else if (type === 'item') vault.items.push(parsed as VaultFile<Extract<VaultFrontmatter, { type: 'item' }>>)
      else vault.spells.push(parsed as VaultFile<Extract<VaultFrontmatter, { type: 'spell' }>>)
    } else if (!isTemplateFile(raw) && looksLikeLegacyCharacter(raw.data)) {
      vault.characters.push({ path: raw.path, frontmatter: normalizeLegacyCharacter(raw, rawFiles), body: raw.body })
    }
  }

  return vault
}
