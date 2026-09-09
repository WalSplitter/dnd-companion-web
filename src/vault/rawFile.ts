import { load as loadYaml } from 'js-yaml'
import type { VaultSourceFile } from './types'

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

export function findRawFileByName(files: RawFile[], name: string): RawFile | undefined {
  const target = name.trim().toLowerCase()
  return files.find((f) => f.name.trim().toLowerCase() === target)
}
