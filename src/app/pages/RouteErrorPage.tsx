import { Link } from 'react-router-dom'

export function RouteErrorPage() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" to="/">
            Dev Intelligence
          </Link>
        </div>
      </header>
      <main className="container page-content" id="main-content" tabIndex={-1}>
        <h1>We couldn’t open this page</h1>
        <p>
          An unexpected page error occurred. Return to search and try again.
        </p>
        <Link to="/">Return to search</Link>
      </main>
      <footer className="site-footer">
        <div className="container">
          Built with data from the GitHub public API.
        </div>
      </footer>
    </div>
  )
}
