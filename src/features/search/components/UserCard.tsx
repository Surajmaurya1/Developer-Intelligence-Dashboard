import { useEffect, useRef, useState } from 'react'
import { ApiError } from '@/shared/api/errors'
import { formatCompactNumber } from '@/shared/lib/formatters'
import type { User } from '@/shared/types/github'
import { useUser } from '@/features/search/hooks/useUser'
import { SpotlightCard } from '@/shared/ui/easyui/SpotlightCard'

type UserCardProps = {
  user: User
  onRateLimit: (login: string, error: ApiError) => void
  onRateLimitCleared: (login: string) => void
}

export function UserCard({
  user,
  onRateLimit,
  onRateLimitCleared,
}: UserCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [isNearViewport, setIsNearViewport] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )
  const detailQuery = useUser(user.login, isNearViewport)
  const detailError =
    detailQuery.error instanceof ApiError ? detailQuery.error : null

  useEffect(() => {
    const card = cardRef.current
    if (!card || isNearViewport) return
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '180px' },
    )

    observer.observe(card)
    return () => observer.disconnect()
  }, [isNearViewport])

  useEffect(() => {
    if (detailError?.kind === 'rate_limit') onRateLimit(user.login, detailError)
    else onRateLimitCleared(user.login)
  }, [
    detailError,
    detailQuery.data,
    onRateLimit,
    onRateLimitCleared,
    user.login,
  ])

  return (
    <SpotlightCard className="user-card-spotlight">
      <article className="user-card" ref={cardRef}>
        <img
          alt={`${user.login} avatar`}
          className="user-avatar"
          height={56}
          loading="lazy"
          src={user.avatarUrl}
          width={56}
        />
        <div className="user-card-content">
          <h3>
            <a href={user.htmlUrl} rel="noopener noreferrer" target="_blank">
              @{user.login}
            </a>
          </h3>
          <div aria-busy={isNearViewport && detailQuery.isFetching}>
            {detailQuery.data?.name && (
              <p className="user-name">{detailQuery.data.name}</p>
            )}
            {isNearViewport && detailQuery.isPending && (
              <div aria-hidden="true" className="user-detail-skeleton">
                <span />
                <span />
                <span />
              </div>
            )}
            {detailQuery.data && (
              <ul
                aria-label={`${user.login} profile statistics`}
                className="user-stats"
              >
                <li>
                  {formatCompactNumber(detailQuery.data.followers)} followers
                </li>
                <li>
                  {formatCompactNumber(detailQuery.data.following)} following
                </li>
                <li>
                  {formatCompactNumber(detailQuery.data.publicRepos)} public
                  repositories
                </li>
                {detailQuery.data.location && (
                  <li>{detailQuery.data.location}</li>
                )}
              </ul>
            )}
            {detailQuery.isError && detailError?.kind !== 'aborted' && (
              <div className="user-detail-error">
                <p>
                  {detailError?.kind === 'rate_limit'
                    ? 'GitHub is rate limiting profile details.'
                    : 'Profile details are unavailable right now.'}
                </p>
                {detailError?.kind === 'rate_limit' && detailError.resetAt && (
                  <p>
                    Details can be retried after{' '}
                    {detailError.resetAt.toLocaleTimeString()}.
                  </p>
                )}
                <RetryButton
                  error={detailError}
                  isFetching={detailQuery.isFetching}
                  onRetry={() => {
                    void detailQuery.refetch()
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </article>
    </SpotlightCard>
  )
}

type RetryButtonProps = {
  error: ApiError | null
  isFetching: boolean
  onRetry: () => void
}

function RetryButton({ error, isFetching, onRetry }: RetryButtonProps) {
  const [now, setNow] = useState(Date.now())
  const retryState = useRef<{ error: ApiError | null; retryAt: number | null }>(
    { error: null, retryAt: null },
  )

  if (retryState.current.error !== error) {
    retryState.current = {
      error,
      retryAt:
        error?.kind === 'rate_limit'
          ? (error.resetAt?.getTime() ?? Date.now() + 60_000)
          : null,
    }
  }
  const retryAt = error?.resetAt?.getTime() ?? retryState.current.retryAt

  useEffect(() => {
    if (retryAt === null || retryAt === undefined) return
    const delay = retryAt - Date.now()
    if (delay <= 0) return
    const timeoutId = window.setTimeout(() => setNow(Date.now()), delay)
    return () => window.clearTimeout(timeoutId)
  }, [retryAt])

  const rateLimitActive =
    error?.kind === 'rate_limit' &&
    (retryAt === null || retryAt === undefined || retryAt > now)

  return (
    <button
      disabled={isFetching || rateLimitActive}
      onClick={onRetry}
      type="button"
    >
      {rateLimitActive
        ? 'Retry after rate limit resets'
        : 'Retry profile details'}
    </button>
  )
}