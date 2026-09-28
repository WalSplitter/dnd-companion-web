/**
 * A d20 in line art: the icosahedron's silhouette (a hexagon) with its front face and the edges
 * running out to the rim. Strokes and fills use `currentColor`, so the button's colour tints the
 * whole die. `rolling` plays the tumble once; remount it with a new `key` to play it again.
 */
export function D20Icon({ rolling = false }: { rolling?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`d20-icon ${rolling ? 'is-rolling' : ''}`} aria-hidden>
      <path className="d20-face-side" d="M12 2 20.66 7v10L12 22l-8.66-5V7Z" />
      <path className="d20-face-front" d="M12 7.2 16.6 15.2H7.4Z" />
      <path
        className="d20-edges"
        d="M12 2 20.66 7v10L12 22l-8.66-5V7ZM12 7.2 16.6 15.2H7.4ZM12 7.2V2M12 7.2 3.34 7M12 7.2 20.66 7M7.4 15.2 3.34 7M7.4 15.2 3.34 17M7.4 15.2 12 22M16.6 15.2 20.66 7M16.6 15.2 20.66 17M16.6 15.2 12 22"
      />
    </svg>
  )
}
