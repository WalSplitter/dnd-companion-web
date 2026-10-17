import { load as loadYaml } from 'js-yaml'
import type { VaultSourceFile } from './types'
import { linkFile } from './wikilinkSyntax'

export interface RawFile {
  path: string
  /** Filename without extension — how Obsidian wikilinks address this file, regardless of folder. */
  name: string
  data: Record<string, unknown>
  body: string
}

// Matches a leading `---\n...\n---` YAML block (Obsidian's frontmatter delimiters), capturing the
// YAML source and the remaining markdown body. Written by hand rather than via `gray-matter` because
// that library shells out to Node's `Buffer` global, which doesn't exist in the browser this app runs in.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export function parseRawFile(file: VaultSourceFile): RawFile {
  const match = FRONTMATTER_RE.exec(file.content)
  const fileName = file.path.split('/').pop() ?? file.path
  const name = fileName.replace(/\.md$/i, '')

  let data: Record<string, unknown> = {}
  if (match) {
    try {
      data = (loadYaml(match[1]) as Record<string, unknown> | undefined) ?? {}
    } catch (err) {
      // A vault authored by hand (or another tool) will occasionally have malformed YAML in one
      // file; that shouldn't take down parsing for the rest of the vault.
      console.warn(`Skipping frontmatter in ${file.path}: ${err instanceof Error ? err.message : err}`)
    }
  }

  const body = (match ? match[2] : file.content).trim()
  return { path: file.path, name, data, body }
}

/**
 * Lookups over one parsed vault, built once per file list (it never changes once parsed): adapters
 * look notes up by name hundreds of times per load — every feature, class, item and back-link —
 * which as linear scans over a large vault adds up.
 */
interface FileIndex {
  /** Lower-cased filename → the first file of that name (as `find` would return it). */
  byName: Map<string, RawFile>
  /** Lower-cased character filename → the notes linking back via `Charakter: "[[…]]"`, in vault order. */
  backlinks: Map<string, RawFile[]>
}

const indexes = new WeakMap<RawFile[], FileIndex>()

function indexOf(files: RawFile[]): FileIndex {
  let index = indexes.get(files)
  if (!index) {
    index = { byName: new Map(), backlinks: new Map() }
    for (const f of files) {
      const name = f.name.trim().toLowerCase()
      if (!index.byName.has(name)) index.byName.set(name, f)
      const owner = linkFile(f.data.Charakter).toLowerCase()
      if (owner) {
        const list = index.backlinks.get(owner)
        if (list) list.push(f)
        else index.backlinks.set(owner, [f])
      }
    }
    indexes.set(files, index)
  }
  return index
}

export function findRawFileByName(files: RawFile[], name: string): RawFile | undefined {
  return indexOf(files).byName.get(name.trim().toLowerCase())
}

/** The notes linking back to the character file `name` via `Charakter: "[[name]]"` (not the file itself). */
export function backlinksTo(files: RawFile[], name: string): RawFile[] {
  const target = name.trim().toLowerCase()
  return (indexOf(files).backlinks.get(target) ?? []).filter((f) => f.name.trim().toLowerCase() !== target)
}
