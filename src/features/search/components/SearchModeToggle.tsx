import type { SearchMode } from '@/shared/lib/searchParams'
import { AnimatedTabs, type AnimatedTabItem } from '@/shared/ui/easyui/AnimatedTabs'

type SearchModeToggleProps = {
  mode: SearchMode
  onChange: (mode: SearchMode) => void
}

const modes: ReadonlyArray<AnimatedTabItem<SearchMode>> = [
  { value: 'repos', label: 'Repositories' },
  { value: 'users', label: 'Users' },
]

/**
 * SearchModeToggle is a thin wrapper around the EasyUI AnimatedTabs primitive.
 * It keeps the exact ARIA contract the search page tests rely on (radiogroup
 * with role="radio" children named "Repositories" and "Users").
 */
export function SearchModeToggle({ mode, onChange }: SearchModeToggleProps) {
  return (
    <AnimatedTabs
      ariaLabel="Search type"
      idPrefix="search-mode"
      items={modes}
      onChange={onChange}
      value={mode}
    />
  )
}