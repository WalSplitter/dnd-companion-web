import type { Item } from '@owlbear-rodeo/sdk'
import { useEffect, useState } from 'react'
import { getObr, useOwlbearStore } from './owlbearStore'

interface SelectedToken {
  /** False while no scene is open in the room — there are no tokens to pick then. */
  sceneReady: boolean
  /** The first item this player selected on the map, kept current as it changes. */
  item: Item | null
}

export function useSelectedToken(): SelectedToken {
  const ready = useOwlbearStore((s) => s.ready)
  const [state, setState] = useState<SelectedToken>({ sceneReady: false, item: null })

  useEffect(() => {
    const obr = getObr()
    if (!obr || !ready) return
    let active = true
    const refresh = async () => {
      if (!(await obr.scene.isReady())) {
        if (active) setState({ sceneReady: false, item: null })
        return
      }
      const ids = (await obr.player.getSelection()) ?? []
      const items = ids.length > 0 ? await obr.scene.items.getItems(ids) : []
      if (active) setState({ sceneReady: true, item: items[0] ?? null })
    }
    void refresh()
    // Selection changes come with the player; metadata changes (a link) with the items.
    const unsubscribe = [obr.player.onChange(() => void refresh()), obr.scene.onReadyChange(() => void refresh()), obr.scene.items.onChange(() => void refresh())]
    return () => {
      active = false
      for (const off of unsubscribe) off()
    }
  }, [ready])

  return state
}
