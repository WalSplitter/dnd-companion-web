import type { VaultSourceFile } from '../types'
import type { ImageAssets } from '../types'
import { isIgnoredPath, isImageFile } from '../vaultLoader'
import type { BlobCache } from './blobCache'
import { fetchBlob, fetchSnapshot, GitHubError, type GitHubSnapshot, type GitHubVaultRef } from './githubApi'

const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml', // without the type an <img> refuses to render an SVG object URL
  bmp: 'image/bmp',
  avif: 'image/avif',
}

function imageType(path: string): string {
  return IMAGE_TYPES[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'
}

interface VaultBlob {
  /** Path relative to the vault root (the `subpath` folder), as the local loaders report it. */
  path: string
  sha: string
}

/** The tree's markdown notes and image attachments inside `subpath`, minus dot-folders (`.obsidian`, …). */
export function selectVaultBlobs(snapshot: GitHubSnapshot, subpath: string): { mdFiles: VaultBlob[]; imageFiles: VaultBlob[] } {
  const prefix = subpath ? `${subpath}/` : ''
  const mdFiles: VaultBlob[] = []
  const imageFiles: VaultBlob[] = []
  let insideSubpath = !subpath
  for (const entry of snapshot.entries) {
    if (!entry.path.startsWith(prefix)) continue
    insideSubpath = true
    if (entry.type !== 'blob') continue
    const path = entry.path.slice(prefix.length)
    if (isIgnoredPath(path)) continue
    if (path.toLowerCase().endsWith('.md')) mdFiles.push({ path, sha: entry.sha })
    else if (isImageFile(path)) imageFiles.push({ path, sha: entry.sha })
  }
  if (!insideSubpath) throw new GitHubError('subpath-not-found', `The folder "${subpath}" does not exist on this branch.`)
  return { mdFiles, imageFiles }
}

/** Runs `task` over `items` with at most `limit` in flight — GitHub caps concurrent requests (and frowns on
 * bursts); for a ~500-note vault, 16 at a time halved a cold load against 8 while 24 gained nothing. */
async function mapConcurrent<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await task(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

const CONCURRENCY = 16

export interface GitHubVaultContents {
  files: VaultSourceFile[]
  imageAssets: ImageAssets
  snapshot: GitHubSnapshot
  /** GitHub was unreachable: this is the copy kept from the last visit. */
  offline: boolean
}

/** Where the listing of the last vault read is kept, so it can be read again without a connection. */
export interface SnapshotStore {
  load(): Promise<GitHubSnapshot | undefined>
  save(snapshot: GitHubSnapshot): Promise<void>
}

/**
 * Reads a vault out of a GitHub repository: one tree listing, then each note and image by blob SHA —
 * served from `cache` when this exact content was downloaded before. Produces the same `files` /
 * `imageAssets` shape as the local folder loaders, so parsing doesn't care where the vault came from.
 *
 * Without a connection, the listing kept in `snapshots` stands in for GitHub's and every file comes
 * from `cache` — the vault as of the last visit. It fails like any offline load when either is missing.
 */
export async function readVaultFromGitHub(
  token: string,
  ref: GitHubVaultRef,
  options: { cache?: BlobCache | null; snapshots?: SnapshotStore; onProgress?: (done: number, total: number) => void } = {},
): Promise<GitHubVaultContents> {
  const { cache, snapshots, onProgress } = options
  let snapshot: GitHubSnapshot
  let offline = false
  try {
    snapshot = await fetchSnapshot(token, ref)
  } catch (err) {
    const kept = err instanceof GitHubError && err.kind === 'network' ? await snapshots?.load() : undefined
    if (!kept) throw err
    snapshot = kept
    offline = true
  }
  const { mdFiles, imageFiles } = selectVaultBlobs(snapshot, ref.subpath)

  const total = mdFiles.length + imageFiles.length
  let done = 0
  onProgress?.(0, total)
  async function load({ sha }: VaultBlob): Promise<ArrayBuffer> {
    let data = await cache?.get(sha)
    if (!data) {
      data = await fetchBlob(token, ref, sha)
      await cache?.put(sha, data)
    }
    onProgress?.(++done, total)
    return data
  }

  const decoder = new TextDecoder('utf-8')
  const [notes, images] = await Promise.all([
    mapConcurrent(mdFiles, CONCURRENCY, async (blob) => ({ path: blob.path, content: decoder.decode(await load(blob)) })),
    mapConcurrent(imageFiles, CONCURRENCY, async (blob) => ({ path: blob.path, data: await load(blob) })),
  ])

  const imageAssets: ImageAssets = new Map()
  for (const { path, data } of images) {
    const name = path.split('/').pop() ?? path
    imageAssets.set(name.toLowerCase(), URL.createObjectURL(new Blob([data], { type: imageType(path) })))
  }

  await cache?.retainOnly(new Set([...mdFiles, ...imageFiles].map((b) => b.sha)))
  if (!offline) await snapshots?.save(snapshot).catch(() => {}) // without it, just no offline copy
  return { files: notes, imageAssets, snapshot, offline }
}
