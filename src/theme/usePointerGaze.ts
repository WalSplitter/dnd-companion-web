import { useEffect, useRef, type RefObject } from 'react'

interface Gaze {
  /** Centres of the eyes in the drawing's viewBox. */
  eyes: [number, number][]
  /** Width of the drawing's viewBox, to map it onto the screen. */
  viewBoxWidth: number
  /** How far (in viewBox units) the pupils may roam from the centres. */
  reach: number
  /** Degrees the whole drawing tilts towards the pointer's height; 0 keeps it still. */
  tilt?: number
}

/**
 * Makes a drawing's pupils follow the pointer: returns the svg ref and one ref slot per eye; each
 * pupil group gets a CSS translate towards the pointer (smooth it with a transition). Without a
 * pointer (touch) the eyes stare at the middle of the page — at you.
 */
export function usePointerGaze({ eyes, viewBoxWidth, reach, tilt = 0 }: Gaze): {
  svgRef: RefObject<SVGSVGElement | null>
  pupils: RefObject<(SVGGElement | null)[]>
} {
  const svgRef = useRef<SVGSVGElement>(null)
  const pupils = useRef<(SVGGElement | null)[]>([])

  useEffect(() => {
    let pointer: { x: number; y: number } | null = null
    let frame = 0
    const aim = () => {
      frame = 0
      const svg = svgRef.current
      if (!svg) return
      const box = svg.getBoundingClientRect()
      const scale = box.width / viewBoxWidth
      const target = pointer ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      eyes.forEach(([cx, cy], i) => {
        const dx = target.x - (box.left + cx * scale)
        const dy = target.y - (box.top + cy * scale)
        const dist = Math.hypot(dx, dy) || 1
        const r = Math.min(1, dist / 200) * reach
        const pupil = pupils.current[i]
        if (pupil) pupil.style.transform = `translate(${((dx / dist) * r).toFixed(1)}px, ${((dy / dist) * r).toFixed(1)}px)`
      })
      if (tilt) {
        const lean = Math.max(-1, Math.min(1, (target.y - (box.top + box.height / 2)) / window.innerHeight)) * tilt
        svg.style.transform = `rotate(${(-lean).toFixed(1)}deg)`
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(aim)
    }
    const onMove = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY }
      schedule()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
  }, [eyes, viewBoxWidth, reach, tilt])

  return { svgRef, pupils }
}
