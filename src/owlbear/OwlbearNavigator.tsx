import { useEffect, useRef } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { characterRoute } from '../routes/paths'
import { useVaultStore } from '../store/vaultStore'
import { readLink } from './live'
import { isNavigation, NAVIGATE_CHANNEL } from './navigate'
import { getObr, useOwlbearStore } from './owlbearStore'
import { useSelectedToken } from './useSelectedToken'

/**
 * Turns the companion's page from Owlbear Rodeo: to what a token's context menu asked for (see
 * `contextMenu.ts`), and — while a sheet is open — to the sheet of a linked token picked on the map.
 */
export function OwlbearNavigator() {
  const navigate = useNavigate()
  const ready = useOwlbearStore((s) => s.ready)
  const { pathname } = useLocation()
  const { item } = useSelectedToken()
  const characters = useVaultStore((s) => s.vault.characters)
  /** The token selected before — only picking another one turns the page, not merely opening a sheet. */
  const previous = useRef<string | null>(null)

  useEffect(() => {
    const obr = getObr()
    if (!obr || !ready) return
    return obr.broadcast.onMessage(NAVIGATE_CHANNEL, ({ data }) => {
      if (isNavigation(data)) navigate(data.path)
    })
  }, [ready, navigate])

  useEffect(() => {
    const id = item?.id ?? null
    if (id === previous.current) return
    previous.current = id
    const link = item && readLink(item.metadata)
    const shown = matchPath('/characters/:characterName', pathname)?.params.characterName
    if (!link || shown === undefined || shown === link.character) return
    if (characters.some((c) => c.frontmatter.name === link.character)) navigate(characterRoute(link.character))
  }, [item, pathname, characters, navigate])

  return null
}
