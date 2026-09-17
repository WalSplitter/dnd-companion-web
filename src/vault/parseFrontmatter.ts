import { isRecord, looksLikeLegacyCharacter, normalizeLegacyCharacter } from './adapters/legacyCharacterSheet'
import { looksLikeLegacySpellNote, normalizeLegacySpellNote } from './adapters/legacySpell'
import { looksLikeEndeavourItem, normalizeEndeavourItem } from './adapters/endeavourItem'
import { parseRawFile, type RawFile } from './rawFile'
import type { ImageAssets } from './vaultLoader'
import { ABILITIES } from './types'
import type {
  AbilityKey,
  CharacterFrontmatter,
  CharacterWriteTargets,
  FieldWriteTarget,
  Vault,
  VaultFile,
  VaultFrontmatter,
  VaultSourceFile,
} from './types'

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

/**
 * Write targets for the app's own `type: character` schema — trivial compared to the legacy
 * adapter's (`legacyCharacterSheet.ts`): everything always lives on the character's own file, at
 * the same key names the frontmatter already uses, since `raw.data` is used as the schema as-is.
 */
function ownSchemaWriteTargets(path: string, data: Record<string, unknown>): CharacterWriteTargets | undefined {
  const targets: CharacterWriteTargets = {}

  if (isRecord(data.hp)) {
    targets.hp_current = { path, keyPath: ['hp', 'current'] }
    targets.hp_temp = { path, keyPath: ['hp', 'temp'] }
  }

  if (isRecord(data.hit_dice) && typeof data.hit_dice.total === 'number') {
    // Own schema stores `used`, not remaining — the UI edits remaining, so this is written inverted.
    targets.hit_dice_remaining = { path, keyPath: ['hit_dice', 'used'], encode: 'invert-from-max', max: data.hit_dice.total }
  }

  if (isRecord(data.abilities)) {
    const abilities = {} as Record<AbilityKey, FieldWriteTarget>
    for (const { key } of ABILITIES) abilities[key] = { path, keyPath: ['abilities', key] }
    targets.abilities = abilities
  }

  const slots = isRecord(data.spellcasting) && isRecord(data.spellcasting.slots) ? data.spellcasting.slots : undefined
  if (slots) {
    const spellSlots: Record<string, FieldWriteTarget> = {}
    for (const grade of Object.keys(slots)) spellSlots[grade] = { path, keyPath: ['spellcasting', 'slots', grade, 'used'] }
    targets.spell_slots = spellSlots
  }

  return Object.keys(targets).length > 0 ? targets : undefined
}

// Files under a path containing "vorlage" (German for "template") are the vault's blank
// character-sheet templates, not real characters — skip them even though they structurally
// match the legacy character format.
function isTemplateFile(raw: RawFile): boolean {
  return /vorlage/i.test(raw.path)
}

/**
 * Parses all source files and buckets them by type. Two frontmatter conventions are recognized:
 *  - the app's own `type: character|item|spell` marker (see `types.ts`)
 *  - an existing campaign vault's schema with no `type:` marker — characters and spell notes are
 *    detected structurally and normalized by `adapters/legacyCharacterSheet.ts` / `adapters/legacySpell.ts`
 * Files matching neither, and not the experimental `Gegenstand/...`-tagged "Endeavour" item shape
 * (see `adapters/endeavourItem.ts`, collected into `vault.endeavourItems`), are kept as plain notes.
 * The legacy vault's own item notes fall into this last bucket: their schema varies too much per
 * category — weapon/armor/food/... — for a single structural adapter to be worthwhile yet, so items
 * only show up as the inline `InlineItem` entries a character's inventory table already carries, not
 * as browsable `vault.items` entries.
 */
export function buildVault(files: VaultSourceFile[], imageAssets?: ImageAssets): Vault {
  const vault: Vault = { characters: [], items: [], spells: [], notes: [], endeavourItems: [] }
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
      if (type === 'character') {
        const character = parsed.frontmatter as CharacterFrontmatter
        vault.characters.push({
          ...parsed,
          frontmatter: { ...character, _write: ownSchemaWriteTargets(raw.path, raw.data) },
        } as VaultFile<Extract<VaultFrontmatter, { type: 'character' }>>)
      } else if (type === 'item') vault.items.push(parsed as VaultFile<Extract<VaultFrontmatter, { type: 'item' }>>)
      else vault.spells.push(parsed as VaultFile<Extract<VaultFrontmatter, { type: 'spell' }>>)
    } else if (!isTemplateFile(raw) && looksLikeLegacyCharacter(raw.data)) {
      vault.characters.push({ path: raw.path, frontmatter: normalizeLegacyCharacter(raw, rawFiles, imageAssets), body: raw.body })
    } else if (looksLikeLegacySpellNote(raw.data)) {
      // Kept raw (not pre-flattened to plain text) — the UI renders every spell/item body through
      // `renderObsidianBody` (`WikiLink.tsx`) uniformly, which strips Obsidian-only syntax while
      // preserving line breaks and turning wikilinks into clickable links.
      vault.spells.push({ path: raw.path, frontmatter: normalizeLegacySpellNote(raw), body: raw.body })
    } else if (looksLikeEndeavourItem(raw.data)) {
      // Experimental — see `adapters/endeavourItem.ts`'s doc comment for why this is a separate
      // collection rather than folded into `vault.items`.
      vault.endeavourItems.push({ path: raw.path, frontmatter: normalizeEndeavourItem(raw), body: raw.body })
    } else {
      // Everything else (rule pages, class/feature lore, weapon/item stat blocks the legacy vault's
      // varying schemas aren't worth a dedicated adapter for yet, ...) is kept as a plain note so any
      // `[[Wikilink]]` pointing at it can still resolve to something in the UI (see wikilinks.ts).
      vault.notes.push({ path: raw.path, name: raw.name, body: raw.body })
    }
  }

  return vault
}
