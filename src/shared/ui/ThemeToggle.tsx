import { useState } from 'react'

const STORAGE_KEY = 'developer-intelligence-theme'
type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  function toggleTheme(): void {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = nextTheme
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
    } catch {
      // Theme changes remain active for this session if storage is unavailable.
    }
    setTheme(nextTheme)
  }

  return (
    <button
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="theme-toggle"
      onClick={toggleTheme}
      type="button"
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  )
}
