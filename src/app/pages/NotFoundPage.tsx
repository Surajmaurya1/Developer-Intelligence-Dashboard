import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title">
      <p className="eyebrow">404 · Page not found</p>
      <h1 id="not-found-title">This page doesn’t exist</h1>
      <p>The link may be out of date, or the page may have moved.</p>
      <Link to="/">Return to search</Link>
    </section>
  )
}
