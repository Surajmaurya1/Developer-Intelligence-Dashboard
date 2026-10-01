import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'

describe('application routes', () => {
  it('renders the search page and shared landmarks', async () => {
    window.history.pushState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'Developer Intelligence Dashboard',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Skip to content' }),
    ).toHaveAttribute('href', '#main-content')
  })

  it('renders a not found page for unknown routes', async () => {
    window.history.pushState({}, '', '/missing')
    window.dispatchEvent(new PopStateEvent('popstate'))
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'This page doesn’t exist' }),
    ).toBeInTheDocument()
  })
})
