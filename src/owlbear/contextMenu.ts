import type OBR from '@owlbear-rodeo/sdk'
import { characterRoute } from '../routes/paths'
import { LINK_KEY, readLink } from './live'
import { showInPanel } from './navigate'
import { pageDictionary } from './pageLang'

type Obr = typeof OBR

const icon = (file: string) => new URL(`${import.meta.env.BASE_URL}${file}`, window.location.origin).href

/**
 * The companion's entries in the context menu of a token: a linked token opens its character's
 * sheet; the GM links an unlinked one at the table, which opens with it selected.
 */
export function startContextMenu(obr: Obr) {
  const dictionary = pageDictionary()
  void obr.contextMenu.create({
    id: 'dnd-companion/open-sheet',
    icons: [
      {
        icon: icon('owlbear-sheet.svg'),
        label: dictionary['owlbear.menuOpenSheet'],
        filter: { max: 1, every: [{ key: ['metadata', LINK_KEY], value: undefined, operator: '!=' }] },
      },
    ],
    onClick: ({ items }) => {
      const link = items[0] && readLink(items[0].metadata)
      if (link) void showInPanel(obr, characterRoute(link.character))
    },
  })
  void obr.contextMenu.create({
    id: 'dnd-companion/link',
    icons: [
      {
        icon: icon('owlbear-link.svg'),
        label: dictionary['owlbear.menuLink'],
        filter: {
          roles: ['GM'],
          max: 1,
          every: [
            { key: 'layer', value: 'CHARACTER' },
            { key: ['metadata', LINK_KEY], value: undefined },
          ],
        },
      },
    ],
    // The table's linker works on the selected token, and asks for the character right away.
    onClick: ({ items }) => {
      const id = items[0]?.id
      if (id) void obr.player.select([id]).then(() => showInPanel(obr, `/table#link=${encodeURIComponent(id)}`))
    },
  })
}
