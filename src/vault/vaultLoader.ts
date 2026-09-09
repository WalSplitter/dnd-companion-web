import type { VaultSourceFile } from './types'

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

async function* walk(
  handle: FileSystemDirectoryHandle,
  path: string,
): AsyncGenerator<{ path: string; handle: FileSystemFileHandle }> {
  for await (const entry of handle.values()) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name
    if (entry.kind === 'directory') {
      yield* walk(entry, entryPath)
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      yield { path: entryPath, handle: entry }
    }
  }
}

/** Opens the native directory picker. Chromium-only. */
export async function showVaultDirectoryPicker(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) {
    throw new Error('File System Access API is not supported in this browser.')
  }
  return window.showDirectoryPicker({ mode: 'read' })
}

export async function readVaultFromDirectoryHandle(root: FileSystemDirectoryHandle): Promise<VaultSourceFile[]> {
  const files: VaultSourceFile[] = []
  for await (const { path, handle } of walk(root, '')) {
    const file = await handle.getFile()
    files.push({ path, content: await file.text() })
  }
  return files
}

/** Fallback for browsers without the File System Access API: reads a `<input webkitdirectory>` FileList. */
export async function readVaultFromFileList(fileList: FileList): Promise<VaultSourceFile[]> {
  const mdFiles = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith('.md'))
  return Promise.all(
    mdFiles.map(async (file) => ({
      path: (file.webkitRelativePath || file.name).replace(/\\/g, '/'),
      content: await file.text(),
    })),
  )
}
