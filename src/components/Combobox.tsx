import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type InputHTMLAttributes, type KeyboardEvent, type Ref } from 'react'

export interface ComboboxOption {
  value: string
  /** What the list shows and filters by, when that isn't the value itself. */
  label?: string
  /** Small tag after the value, e.g. why this option is suggested first. */
  badge?: string
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'list' | 'role'>

/** Gap between the field and the list, and the least room the list wants before it flips above the field. */
const GAP = 4
const MIN_ROOM = 180
const MAX_HEIGHT = 256

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/**
 * A text field with themed suggestions — the app's stand-in for `<input list>`, whose native popup
 * can't be styled. Typing filters the suggestions but never restricts the value: anything can still be
 * typed or pasted. The list is `position: fixed` so a scrolling ancestor (e.g. a modal's form) can't
 * clip it, and it opens above the field when there isn't room below.
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  className = '',
  onBlur,
  onKeyDown,
  ref,
  ...inputProps
}: InputProps & {
  ref?: Ref<HTMLInputElement>
  id: string
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  // What the list is filtered by: the typed text, or nothing right after opening — so a field that
  // already holds a choice still shows every alternative.
  const [filter, setFilter] = useState('')
  const [active, setActive] = useState(-1)
  const [position, setPosition] = useState<CSSProperties>({})
  useImperativeHandle(ref, () => inputRef.current!, [])

  const needle = filter.trim().toLowerCase()
  const shown = needle ? options.filter((o) => (o.label ?? o.value).toLowerCase().includes(needle)) : options
  const expanded = open && shown.length > 0
  const listId = `${id}-listbox`

  function show() {
    setFilter('')
    setActive(-1)
    setOpen(true)
  }

  function choose(option: ComboboxOption) {
    onChange(option.value)
    setOpen(false)
  }

  useLayoutEffect(() => {
    if (!expanded) return
    function place() {
      const rect = inputRef.current?.getBoundingClientRect()
      if (!rect) return
      const below = window.innerHeight - rect.bottom - GAP * 2
      const above = rect.top - GAP * 2
      const flip = below < MIN_ROOM && above > below
      setPosition({
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(MAX_HEIGHT, flip ? above : below),
        ...(flip ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [expanded])

  useEffect(() => {
    if (active >= 0) listRef.current?.children[active]?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  function keyDown(e: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!expanded) return show()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + shown.length) % shown.length)
    } else if (e.key === 'Enter' && expanded && active >= 0) {
      e.preventDefault()
      choose(shown[active])
    } else if (e.key === 'Escape' && expanded) {
      // Close just the list, not the dialog around it.
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        {...inputProps}
        ref={inputRef}
        id={id}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className={`rpg-input ${options.length > 0 ? 'pr-8' : ''} ${className}`}
        onChange={(e) => {
          onChange(e.target.value)
          setFilter(e.target.value)
          setActive(-1)
          setOpen(true)
        }}
        onClick={() => !open && show()}
        onKeyDown={keyDown}
        onBlur={(e) => {
          setOpen(false)
          onBlur?.(e)
        }}
      />
      {options.length > 0 && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          // Keep focus in the field, so opening the list doesn't blur (and close) it.
          onMouseDown={(e) => {
            e.preventDefault()
            inputRef.current?.focus()
            if (expanded) setOpen(false)
            else show()
          }}
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-fg-muted transition hover:text-trim"
        >
          <Chevron open={expanded} />
        </button>
      )}
      {expanded && (
        <ul ref={listRef} id={listId} role="listbox" style={position} className="combobox-list fixed z-50 overflow-y-auto rounded-md py-1 text-sm">
          {shown.map((option, i) => (
            <li
              key={option.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(option)
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 ${i === active ? 'bg-trim/15 text-fg' : 'text-fg/85'} ${
                option.value === value ? 'font-semibold text-trim' : ''
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{option.label ?? option.value}</span>
              {option.badge && (
                <span className="shrink-0 rounded-full border border-trim/35 bg-trim/10 px-1.5 py-px text-[0.65rem] font-medium text-trim">{option.badge}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
