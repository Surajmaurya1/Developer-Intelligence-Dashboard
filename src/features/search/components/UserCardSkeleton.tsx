export function UserCardSkeleton() {
  return (
    <article aria-hidden="true" className="user-card user-card-skeleton">
      <span className="user-avatar-skeleton" />
      <div className="user-card-content">
        <span className="skeleton-line skeleton-title" />
        <span className="skeleton-line skeleton-description" />
      </div>
    </article>
  )
}
