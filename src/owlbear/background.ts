import OBR from '@owlbear-rodeo/sdk'
import { startClashBridge } from './clashBridge'

/** Script of `owlbear-background.html`, which Owlbear Rodeo runs unseen for everyone in the room. */
OBR.onReady(() => startClashBridge(OBR))
