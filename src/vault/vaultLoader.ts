import type { VaultSourceFile } from './types'

/** Filename (lowercase) -> displayable URL (object URL or data URL), for resolving attachment
 * references like a character's `Bild: "[[Portrait.jpg]]"` field. */
export type ImageAssets = Map<string, string>

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif']

function isImageFile(name: string): boolean {
  const lower = name.toLowerCase()
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

/**
 * Obsidian vaults never keep real content in dot-prefixed folders, but a vault that's also a git
 * repo can easily have `.git`/`.obsidian` internals that outnumber the actual notes. Skip them
 * rather than pointlessly walking (and, for `.git`, reading) thousands of irrelevant entries.
 */
function isIgnoredDirName(name: string): boolean {
  return name.startsWith('.')
}

function isIgnoredPath(path: string): boolean {
  return path.split('/').some((segment) => isIgnoredDirName(segment))
}

interface FileEntry {
  path: string
  handle: FileSystemFileHandle
}

/** Walks subdirectories concurrently (rather than one `await` at a time) since this is otherwise
 * the slowest part of scanning a large vault. Markdown notes and image attachments are collected
 * in the same pass since it's already walking every entry anyway. */
async function collectVaultFiles(
  handle: FileSystemDirectoryHandle,
  path: string,
): Promise<{ mdFiles: FileEntry[]; imageFiles: FileEntry[] }> {
  const mdFiles: FileEntry[] = []
  const imageFiles: FileEntry[] = []
  const subdirWork: Promise<{ mdFiles: FileEntry[]; imageFiles: FileEntry[] }>[] = []

  for await (const entry of handle.values()) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name
    if (entry.kind === 'directory') {
      if (!isIgnoredDirName(entry.name)) subdirWork.push(collectVaultFiles(entry, entryPath))
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      mdFiles.push({ path: entryPath, handle: entry })
    } else if (isImageFile(entry.name)) {
      imageFiles.push({ path: entryPath, handle: entry })
    }
  }

  for (const nested of await Promise.all(subdirWork)) {
    mdFiles.push(...nested.mdFiles)
    imageFiles.push(...nested.imageFiles)
  }
  return { mdFiles, imageFiles }
}

/** Reads file contents with a concurrency cap: opening/reading a couple thousand files one at a
 * time is what actually makes a large vault feel like loading hung, but firing them all off at
 * once risks exhausting file-handle limits. */
async function readAll(entries: FileEntry[], onProgress?: (done: number, total: number) => void): Promise<VaultSourceFile[]> {
  const results: VaultSourceFile[] = new Array(entries.length)
  let done = 0
  let cursor = 0
  const CONCURRENCY = 32

  async function worker() {
    while (cursor < entries.length) {
      const i = cursor++
      const { path, handle } = entries[i]
      const file = await handle.getFile()
      results[i] = { path, content: await file.text() }
      done++
      onProgress?.(done, entries.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker))
  return results
}

async function buildImageAssets(entries: FileEntry[]): Promise<ImageAssets> {
  const assets: ImageAssets = new Map()
  await Promise.all(
    entries.map(async ({ path, handle }) => {
      const file = await handle.getFile()
      const name = path.split('/').pop() ?? path
      assets.set(name.toLowerCase(), URL.createObjectURL(file))
    }),
  )
  return assets
}

/** Opens the native directory picker. Chromium-only. */
export async function showVaultDirectoryPicker(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) {
    throw new Error('File System Access API is not supported in this browser.')
  }
  return window.showDirectoryPicker({ mode: 'read' })
}

export async function readVaultFromDirectoryHandle(
  root: FileSystemDirectoryHandle,
  onProgress?: (done: number, total: number) => void,
): Promise<{ files: VaultSourceFile[]; imageAssets: ImageAssets }> {
  const { mdFiles, imageFiles } = await collectVaultFiles(root, '')
  const [files, imageAssets] = await Promise.all([readAll(mdFiles, onProgress), buildImageAssets(imageFiles)])
  return { files, imageAssets }
}

/** Fallback for browsers without the File System Access API: reads a `<input webkitdirectory>` FileList. */
export async function readVaultFromFileList(
  fileList: FileList,
): Promise<{ files: VaultSourceFile[]; imageAssets: ImageAssets }> {
  const all = Array.from(fileList).filter((f) => !isIgnoredPath(f.webkitRelativePath || f.name))
  const mdFiles = all.filter((f) => f.name.toLowerCase().endsWith('.md'))
  const imageFiles = all.filter((f) => isImageFile(f.name))

  const files = await Promise.all(
    mdFiles.map(async (file) => ({
      path: (file.webkitRelativePath || file.name).replace(/\\/g, '/'),
      content: await file.text(),
    })),
  )
  const imageAssets: ImageAssets = new Map()
  for (const file of imageFiles) imageAssets.set(file.name.toLowerCase(), URL.createObjectURL(file))

  return { files, imageAssets }
}
