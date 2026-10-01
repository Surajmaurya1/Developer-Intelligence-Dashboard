export function RepoCardSkeleton() {
  return (
    <article aria-hidden="true" className="repo-card repo-card-skeleton">
      <span className="skeleton-line skeleton-owner" />
      <span className="skeleton-line skeleton-title" />
      <span className="skeleton-line skeleton-description" />
      <span className="skeleton-line skeleton-description short" />
      <span className="skeleton-line skeleton-stats" />
    </article>
  )
}
