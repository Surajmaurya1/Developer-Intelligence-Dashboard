import { useCallback, useState } from 'react'
import type { ApiError } from '@/shared/api/errors'
import type { Paginated, User } from '@/shared/types/github'
import { Pagination } from '@/features/search/components/Pagination'
import { UserCard } from '@/features/search/components/UserCard'

type UserResultsProps = {
  results: Paginated<User>
  page: number
  onPageChange: (page: number) => void
}

export function UserResults({ results, page, onPageChange }: UserResultsProps) {
  const [rateLimitedUsers, setRateLimitedUsers] = useState<
    Map<string, ApiError>
  >(() => new Map())

  const handleRateLimit = useCallback((login: string, error: ApiError) => {
    setRateLimitedUsers((current) => {
      if (current.get(login) === error) return current
      const next = new Map(current)
      next.set(login, error)
      return next
    })
  }, [])

  const clearRateLimit = useCallback((login: string) => {
    setRateLimitedUsers((current) => {
      if (!current.has(login)) return current
      const next = new Map(current)
      next.delete(login)
      return next
    })
  }, [])

  const rateLimitError = rateLimitedUsers.values().next().value

  return (
    <>
      {rateLimitError && (
        <p aria-live="polite" className="rate-limit-banner" role="status">
          Some profile details are temporarily limited by GitHub.
          {rateLimitError.resetAt && (
            <> Try again after {rateLimitError.resetAt.toLocaleTimeString()}.</>
          )}
        </p>
      )}
      {results.totalCount > results.reachableCount && (
        <p className="cap-notice">
          GitHub user search can return up to 1,000 results. Refine your search
          to reach more users.
        </p>
      )}
      <div className="user-list">
        {results.items.map((user) => (
          <UserCard
            key={user.id}
            onRateLimit={handleRateLimit}
            onRateLimitCleared={clearRateLimit}
            user={user}
          />
        ))}
      </div>
      <Pagination
        onPageChange={onPageChange}
        page={page}
        totalPages={results.totalPages}
      />
    </>
  )
}
