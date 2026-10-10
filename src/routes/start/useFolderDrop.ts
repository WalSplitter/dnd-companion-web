import { useEffect, useState } from 'react'
import { isFileSystemAccessSupported } from '../../vault/vaultLoader'

export type DroppedHandle = FileSystemFileHandle | FileSystemDirectoryHandle | null

/** Whether folders dropped on the page can be opened (Chromium's `getAsFileSystemHandle`). */
export function supportsFolderDrop(): boolean {
  return isFileSystemAccessSupported() && typeof DataTransferItem !== 'undefined' && 'getAsFileSystemHandle' in DataTransferItem.prototype
}

/**
 * Lets a vault folder be dragged anywhere onto the page: `onDrop` gets the dropped entry's handle
 * (a file, a folder, or null — telling them apart is the caller's job). Returns whether files are
 * being dragged over the window right now, for an overlay. Does nothing where folders can't be
 * dropped (see `supportsFolderDrop`). `onDrop` should be stable — the listeners are re-attached
 * whenever it changes.
 */
export function useFolderDrop(onDrop: (handle: DroppedHandle) => void): boolean {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!supportsFolderDrop()) return
    let depth = 0
    const hasFiles = (e: DragEvent) => Boolean(e.dataTransfer?.types.includes('Files'))
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      setDragging(true)
    }
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onLeave = () => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onDropEvent = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      // Must be requested synchronously inside the drop event, before the data transfer is cleared.
      const pending = e.dataTransfer?.items[0]?.getAsFileSystemHandle?.()
      void pending?.then(onDrop)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDropEvent)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDropEvent)
    }
  }, [onDrop])

  return dragging
}
