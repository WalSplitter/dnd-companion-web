import OBR from '@owlbear-rodeo/sdk'
import { startClashBridge } from './clashBridge'
import { keepPanelInView } from './panel'
import { startRollFx } from './rollFx'

/** Script of `owlbear-background.html`, which Owlbear Rodeo runs unseen for everyone in the room. */
OBR.onReady(() => {
  startClashBridge(OBR)
  startRollFx(OBR)
  keepPanelInView(OBR)
})
