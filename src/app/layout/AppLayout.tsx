import { Link, Outlet } from 'react-router-dom'
import { FavoritesProvider } from '@/shared/hooks/FavoritesProvider'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'

export function AppLayout() {
  return (
    <FavoritesProvider>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="site-header">
          <div className="container header-inner">
            <Link className="brand" to="/">
              Dev Intelligence
            </Link>
            <span className="header-caption">
              Explore the open source ecosystem
            </span>
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className="container page-content">
          <Outlet />
        </main>
        <footer className="site-footer">
          <div className="container">
            Built with data from the GitHub public API.
          </div>
        </footer>
      </div>
    </FavoritesProvider>
  )
}
