import { useState } from 'react'

/** Re-mounted with `key={value}` by the caller whenever `value` changes from outside (a committed
 * edit, or a rollback after a failed write) — simpler and effect-free vs. syncing local text state
 * to an external prop change. */
export function EditableNumber({
  value,
  onCommit,
  className,
  min = 0,
  max,
}: {
  value: number
  onCommit: (next: number) => void
  className: string
  min?: number
  max?: number
}) {
  const [text, setText] = useState(String(value))

  function commit() {
    let parsed = Math.max(min, Math.round(Number(text)))
    if (max !== undefined) parsed = Math.min(max, parsed)
    if (Number.isFinite(parsed) && parsed !== value) onCommit(parsed)
    else setText(String(value))
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setText(String(value))
      }}
      className={className}
    />
  )
}
