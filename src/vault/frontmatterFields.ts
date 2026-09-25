import type { ImageAssets } from './vaultLoader'
import { linkFile } from './wikilinkSyntax'

/**
 * Small, format-agnostic readers for raw frontmatter values, shared by every adapter under
 * `adapters/`. Values straight out of YAML are `unknown`, so each helper narrows defensively instead
 * of trusting the vault's shape.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** A note's `tags:` list, keeping only string entries (an empty `tags:` key parses as `null`). */
export function tagList(data: Record<string, unknown>): string[] {
  const tags = data.tags
  return Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : []
}

/** Obsidian nested-tag match: `needle` itself or any child tag (`needle/...`). */
export function hasTag(tags: string[], needle: string): boolean {
  return tags.some((t) => t === needle || t.startsWith(`${needle}/`))
}

/** Resolves a `"[[Name.jpg]]"` attachment reference (e.g. a `Bild`/`portrait` field) against the
 * loaded image assets, keyed by bare filename regardless of which vault folder it lives in. */
export function resolvePortraitLink(link: unknown, imageAssets: ImageAssets | undefined): string | undefined {
  if (!imageAssets) return undefined
  const target = linkFile(link)
  if (!target) return undefined
  return imageAssets.get(target.toLowerCase())
}
