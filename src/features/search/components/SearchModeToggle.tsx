import type { KeyboardEvent } from 'react'
import type { SearchMode } from '@/shared/lib/searchParams'

type SearchModeToggleProps = {
  mode: SearchMode
  onChange: (mode: SearchMode) => void
}

const modes: Array<{ value: SearchMode; label: string }> = [
  { value: 'repos', label: 'Repositories' },
  { value: 'users', label: 'Users' },
]

export function SearchModeToggle({ mode, onChange }: SearchModeToggleProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const currentIndex = modes.findIndex((item) => item.value === mode)
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const nextMode =
      modes[(currentIndex + direction + modes.length) % modes.length]
    if (nextMode) onChange(nextMode.value)
    document.getElementById(`search-mode-${nextMode?.value}`)?.focus()
  }

  return (
    <div
      aria-label="Search type"
      className="mode-toggle"
      onKeyDown={handleKeyDown}
      role="radiogroup"
      tabIndex={-1}
    >
      {modes.map((item) => (
        <button
          aria-checked={mode === item.value}
          className="mode-option"
          id={`search-mode-${item.value}`}
          key={item.value}
          onClick={() => onChange(item.value)}
          role="radio"
          tabIndex={mode === item.value ? 0 : -1}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
