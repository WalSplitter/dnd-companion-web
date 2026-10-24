/** The small on/off switch of the app's menus (decorative: the menu item around it is the control). */
export function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative h-4 w-7 shrink-0 rounded-full transition ${on ? 'bg-trim' : 'bg-border'}`} aria-hidden>
      <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-surface transition-all ${on ? 'left-3.5' : 'left-0.5'}`} />
    </span>
  )
}
