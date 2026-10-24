import { createPortal } from 'react-dom'
import type { TargetBox } from './useTourTarget'

const PAD = 10

/**
 * The fog of war over the page, lifting where Splitter shines: a soft-edged window around the step's
 * target, moving and resizing smoothly from step to step, with a slow glow on its rim. Without a
 * target the window closes to nothing in the middle. It never takes a click, so the player can act
 * on the lit element (and anything else) while the tour runs.
 */
export function FogSpotlight({ box }: { box: TargetBox | null }) {
  const hole = box
    ? { top: box.top - PAD, left: box.left - PAD, width: box.width + 2 * PAD, height: box.height + 2 * PAD }
    : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 }

  return createPortal(
    <div className={`quest-fog ${box ? 'has-target' : ''}`} aria-hidden>
      <div className="quest-fog-hole" style={hole} />
    </div>,
    document.body,
  )
}
