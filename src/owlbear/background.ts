import OBR from '@owlbear-rodeo/sdk'
import { startClashBridge } from './clashBridge'
import { startContextMenu } from './contextMenu'
import { startInitiativeBridge } from './initiativeBridge'
import { keepPanelInView } from './panel'
import { startRollFx } from './rollFx'
import { startTokenMarkers } from './tokenMarkers'

/** Script of `owlbear-background.html`, which Owlbear Rodeo runs unseen for everyone in the room. */
OBR.onReady(() => {
  startClashBridge(OBR)
  startInitiativeBridge(OBR)
  startTokenMarkers(OBR)
  startRollFx(OBR)
  startContextMenu(OBR)
  keepPanelInView(OBR)
})
