// Minimal ambient types for the File System Access API surface this app uses.
// TypeScript's bundled DOM lib does not yet ship these (Chromium-only API).
interface FileSystemHandle {
  kind: 'file' | 'directory'
  name: string
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file'
  getFile(): Promise<File>
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory'
  values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>
  queryPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>
  requestPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>
}

interface DataTransferItem {
  /** Chromium: the dropped file or folder as a File System Access handle. */
  getAsFileSystemHandle?(): Promise<FileSystemFileHandle | FileSystemDirectoryHandle | null>
}

interface Window {
  showDirectoryPicker?(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
}
