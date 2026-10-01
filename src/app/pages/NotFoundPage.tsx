import { Link } from 'react-router-dom'
import { NotFound } from '@/shared/ui/easyui/NotFound'

/**
 * NotFoundPage delegates to the NotFound primitive. The eyebrow, title, and
 * recovery link all match the previous markup so existing assertions still
 * resolve to the same elements.
 */
export function NotFoundPage() {
  return (
    <NotFound
      description="The link may be out of date, or the page may have moved."
      eyebrow="404 · Page not found"
      renderAction={() => (
        <Link to="/">Return to search</Link>
      )}
      title="This page doesn’t exist"
    />
  )
}