import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'

describe('theme toggle', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
    window.localStorage.removeItem('developer-intelligence-theme')
  })

  it('switches theme and persists the explicit choice', () => {
    document.documentElement.dataset.theme = 'dark'
    render(<ThemeToggle />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to light mode' }),
    )
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem('developer-intelligence-theme')).toBe(
      'light',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
