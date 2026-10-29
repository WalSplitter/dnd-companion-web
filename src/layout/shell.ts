import { useEffect } from 'react'

/*
 * Very wide screens (ultra-wide monitors, 4K at 100%): below these widths the app looks exactly as
 * on a laptop; above them pages use the room. Keep the numbers in step with the `wide` and `ultra`
 * variants in `index.css` and the `[data-shell]` widths in `styles/panorama.css`.
 */

/** Pages widen and lay their cards out side by side: the sheet's tabs, the party, the start page's banners. */
export const WIDE_QUERY = '(min-width: 1900px)'

/** How wide a page wants the app's frame (header, page and footer) on a wide screen. */
export type ShellWidth = 'start' | 'party' | 'sheet'

/**
 * Widens the app's frame while the calling page is shown, as far as the screen allows (see
 * `[data-shell]` in `styles/panorama.css`); `null` keeps the usual width. On narrower screens the
 * CSS ignores it, so pages can ask unconditionally.
 */
export function useShellWidth(width: ShellWidth | null): void {
  useEffect(() => {
    if (!width) return
    const root = document.documentElement
    root.dataset.shell = width
    return () => {
      // The next page may already have set its own
      if (root.dataset.shell === width) delete root.dataset.shell
    }
  }, [width])
}
