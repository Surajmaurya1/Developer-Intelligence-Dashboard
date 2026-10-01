import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { ApiError } from '@/shared/api/errors'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { formatAbsoluteDate } from '@/shared/lib/formatters'
import {
  buildRepositorySearchQuery,
  normalizeSearchQuery,
  parseMinimumStars,
  parsePositiveInteger,
  parseSearchMode,
  type SearchMode,
} from '@/shared/lib/searchParams'
import { Pagination } from '@/features/search/components/Pagination'
import { RepoCard } from '@/features/search/components/RepoCard'
import { RepoCardSkeleton } from '@/features/search/components/RepoCardSkeleton'
import { SearchModeToggle } from '@/features/search/components/SearchModeToggle'
import { useSearchRepos } from '@/features/search/hooks/useSearchRepos'
import { useSearchUsers } from '@/features/search/hooks/useSearchUsers'
import { UserCardSkeleton } from '@/features/search/components/UserCardSkeleton'
import { UserResults } from '@/features/search/components/UserResults'
import { useFavorites } from '@/shared/hooks/useFavorites'

export function SearchPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = normalizeSearchQuery(searchParams.get('q') ?? '')
  const mode = parseSearchMode(searchParams.get('mode'))
  const page = parsePositiveInteger(searchParams.get('page'), 1)
  const language = searchParams.get('language') ?? ''
  const minimumStars = parseMinimumStars(searchParams.get('minStars'))
  const [inputValue, setInputValue] = useState(urlQuery)
  const [minimumStarsInput, setMinimumStarsInput] = useState(
    searchParams.get('minStars') ?? '',
  )
  const debouncedInput = useDebouncedValue(inputValue, 400)
  const debouncedMinimumStars = useDebouncedValue(minimumStarsInput, 400)
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const previousPage = useRef(page)
  const isLocalEditing = useRef(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const { favorites } = useFavorites()
  const repoSearchQuery = buildRepositorySearchQuery(
    urlQuery,
    language,
    minimumStars,
  )
  const repoQuery = useSearchRepos(
    mode === 'repos' ? repoSearchQuery : '',
    page,
  )
  const userQuery = useSearchUsers(mode === 'users' ? urlQuery : '', page)
  const repoIsSuccess = repoQuery.isSuccess
  const repoIsPlaceholderData = repoQuery.isPlaceholderData
  const repoTotalPages = repoQuery.data?.totalPages
  const userIsSuccess = userQuery.isSuccess
  const userIsPlaceholderData = userQuery.isPlaceholderData
  const userTotalPages = userQuery.data?.totalPages

  useEffect(() => {
    isLocalEditing.current = false
    setInputValue(urlQuery)
    setMinimumStarsInput(searchParams.get('minStars') ?? '')
  }, [location.key, searchParams, urlQuery])

  useEffect(() => {
    const debouncedQuery = normalizeSearchQuery(debouncedInput)
    if (debouncedQuery === urlQuery) {
      isLocalEditing.current = false
      if (debouncedInput !== debouncedQuery) setInputValue(debouncedQuery)
      return
    }
    if (!isLocalEditing.current) return
    isLocalEditing.current = false
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (debouncedQuery) next.set('q', debouncedQuery)
        else next.delete('q')
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }, [debouncedInput, setSearchParams, urlQuery])

  useEffect(() => {
    const parsed = parseMinimumStars(debouncedMinimumStars)
    if (debouncedMinimumStars.trim() !== '' && parsed === null) return
    const normalized = parsed === null ? '' : String(parsed)
    if (normalized === (searchParams.get('minStars') ?? '')) return
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (normalized) next.set('minStars', normalized)
        else next.delete('minStars')
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }, [debouncedMinimumStars, searchParams, setSearchParams])

  useEffect(() => {
    if (previousPage.current !== page) {
      if (resultsHeading.current) resultsHeading.current.focus()
      else searchInput.current?.focus()
      const reduceMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      resultsHeading.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    }
    previousPage.current = page
  }, [page])

  const setSearchState = useCallback(
    (
      nextState: { mode?: SearchMode; query?: string; page?: number },
      replace = false,
    ): void => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (nextState.mode) next.set('mode', nextState.mode)
          const nextQuery = normalizeSearchQuery(nextState.query ?? inputValue)
          if (nextQuery) next.set('q', nextQuery)
          else next.delete('q')
          if (nextState.page && nextState.page > 1)
            next.set('page', String(nextState.page))
          else next.delete('page')
          return next
        },
        { replace },
      )
    },
    [inputValue, setSearchParams],
  )

  useEffect(() => {
    const activeIsSuccess = mode === 'repos' ? repoIsSuccess : userIsSuccess
    const activeIsPlaceholderData =
      mode === 'repos' ? repoIsPlaceholderData : userIsPlaceholderData
    const activeTotalPages = mode === 'repos' ? repoTotalPages : userTotalPages
    if (
      !activeIsSuccess ||
      activeIsPlaceholderData ||
      activeTotalPages === undefined
    )
      return
    const lastAvailablePage = Math.max(1, activeTotalPages)
    if (page > lastAvailablePage)
      setSearchState({ page: lastAvailablePage }, true)
  }, [
    mode,
    page,
    repoIsPlaceholderData,
    repoIsSuccess,
    repoTotalPages,
    setSearchState,
    userIsPlaceholderData,
    userIsSuccess,
    userTotalPages,
  ])

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const query = normalizeSearchQuery(inputValue)
    isLocalEditing.current = false
    setInputValue(query)
    setSearchState({ query, page: 1 })
  }

  function handleModeChange(nextMode: SearchMode): void {
    setSearchState({ mode: nextMode, page: 1 })
  }

  function handlePageChange(nextPage: number): void {
    setSearchState({ query: urlQuery, page: nextPage })
  }

  function handleLanguageChange(nextLanguage: string): void {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (nextLanguage) next.set('language', nextLanguage)
      else next.delete('language')
      next.delete('page')
      return next
    })
  }

  function clearFilters(): void {
    setMinimumStarsInput('')
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('language')
      next.delete('minStars')
      next.delete('page')
      return next
    })
  }

  const isSearching = mode === 'repos' && Boolean(urlQuery)
  const isUserSearching = mode === 'users' && Boolean(urlQuery)
  const activeQuery = mode === 'repos' ? repoQuery : userQuery
  const isLoading = (isSearching || isUserSearching) && activeQuery.isPending
  const isRefetching =
    (isSearching || isUserSearching) &&
    activeQuery.isFetching &&
    Boolean(activeQuery.data)
  const error = activeQuery.error
  const apiError = error instanceof ApiError ? error : null
  const statusMessage = isLoading
    ? `Searching ${mode === 'repos' ? 'repositories' : 'users'}…`
    : isRefetching
      ? 'Updating repository results…'
      : mode === 'repos' && repoQuery.data
        ? `${repoQuery.data.totalCount.toLocaleString()} repositories found`
        : mode === 'users' && userQuery.data
          ? `${userQuery.data.totalCount.toLocaleString()} users found`
          : ''

  return (
    <section aria-labelledby="search-title" className="search-page">
      <p className="eyebrow">GitHub explorer</p>
      <h1 id="search-title">Developer Intelligence Dashboard</h1>
      <p className="search-intro">
        Search public repositories and developers across GitHub.
      </p>

      <SearchModeToggle mode={mode} onChange={handleModeChange} />

      <form
        aria-label="Search GitHub"
        className="search-form"
        onSubmit={handleSubmit}
        role="search"
      >
        <label htmlFor="github-search">
          {mode === 'repos' ? 'Search repositories' : 'Search users'}
        </label>
        <div className="search-input-row">
          <input
            autoComplete="off"
            id="github-search"
            name="q"
            onChange={(event) => {
              isLocalEditing.current = true
              setInputValue(event.currentTarget.value)
            }}
            placeholder={
              mode === 'repos'
                ? 'Try “react” or “owner:vercel”'
                : 'Try “octocat”'
            }
            ref={searchInput}
            type="search"
            value={inputValue}
          />
          {inputValue && (
            <button
              aria-label="Clear search"
              onClick={() => {
                isLocalEditing.current = false
                setInputValue('')
                setSearchState({ query: '', page: 1 })
              }}
              type="button"
            >
              Clear
            </button>
          )}
          <button type="submit">Search</button>
        </div>
      </form>

      {mode === 'repos' && (
        <div aria-label="Repository filters" className="repo-filters">
          <label htmlFor="language-filter">Language</label>
          <select
            id="language-filter"
            onChange={(event) =>
              handleLanguageChange(event.currentTarget.value)
            }
            value={language}
          >
            <option value="">Any language</option>
            {[
              'JavaScript',
              'TypeScript',
              'Python',
              'Java',
              'Go',
              'Rust',
              'C++',
              'C#',
              'Ruby',
              'PHP',
              'Swift',
              'Kotlin',
            ].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <label htmlFor="minimum-stars-filter">Minimum stars</label>
          <input
            id="minimum-stars-filter"
            min="0"
            onChange={(event) =>
              setMinimumStarsInput(event.currentTarget.value)
            }
            type="number"
            value={minimumStarsInput}
          />
          <button
            disabled={
              !language && minimumStars === null && minimumStarsInput === ''
            }
            onClick={clearFilters}
            type="button"
          >
            Clear filters
          </button>
        </div>
      )}

      {mode === 'repos' && (
        <button
          aria-pressed={showFavorites}
          className="favorites-view-toggle"
          onClick={() => setShowFavorites((current) => !current)}
          type="button"
        >
          {showFavorites
            ? 'Return to search results'
            : `Show favorites (${favorites.length})`}
        </button>
      )}

      <p aria-live="polite" className="sr-only" role="status">
        {statusMessage}
      </p>

      {mode === 'repos' && showFavorites ? (
        <section aria-labelledby="favorites-title">
          <h2 id="favorites-title">Favorite repositories</h2>
          {favorites.length === 0 ? (
            <p className="state-panel">
              No favorite repositories yet. Add one from a repository card.
            </p>
          ) : (
            <div className="repo-list">
              {favorites.map((repo) => (
                <RepoCard key={repo.fullName} repo={repo} />
              ))}
            </div>
          )}
        </section>
      ) : !urlQuery ? (
        <section aria-labelledby="initial-search-title" className="state-panel">
          <h2 id="initial-search-title">
            {mode === 'repos'
              ? 'Find your next repository'
              : 'Find a GitHub developer'}
          </h2>
          <p>
            {mode === 'repos'
              ? 'Enter a repository name, language, or GitHub search qualifier to get started.'
              : 'Enter a username, name, or GitHub search qualifier to get started.'}
          </p>
        </section>
      ) : isLoading ? (
        <div
          aria-busy="true"
          aria-label={`Loading ${mode === 'repos' ? 'repositories' : 'users'}`}
          className="repo-list"
          role="region"
        >
          {mode === 'repos' ? (
            <>
              <RepoCardSkeleton />
              <RepoCardSkeleton />
              <RepoCardSkeleton />
            </>
          ) : (
            <>
              <UserCardSkeleton />
              <UserCardSkeleton />
              <UserCardSkeleton />
            </>
          )}
        </div>
      ) : mode === 'repos' &&
        repoQuery.isError &&
        !repoQuery.data &&
        apiError?.kind !== 'aborted' ? (
        <section
          aria-labelledby="search-error-title"
          className="state-panel error-panel"
          role="alert"
        >
          <h2 id="search-error-title">Couldn’t search repositories</h2>
          <p>
            {apiError
              ? getErrorMessage(apiError, 'repositories')
              : 'An unexpected error occurred while searching GitHub.'}
          </p>
          {apiError?.kind === 'rate_limit' && apiError.resetAt && (
            <p>Try again after {formatAbsoluteDate(apiError.resetAt)}.</p>
          )}
          <button
            disabled={activeQuery.isFetching}
            onClick={() => {
              void activeQuery.refetch()
            }}
            type="button"
          >
            Retry
          </button>
        </section>
      ) : mode === 'users' &&
        userQuery.isError &&
        !userQuery.data &&
        apiError?.kind !== 'aborted' ? (
        <section
          aria-labelledby="search-error-title"
          className="state-panel error-panel"
          role="alert"
        >
          <h2 id="search-error-title">Couldn’t search users</h2>
          <p>
            {apiError
              ? getErrorMessage(apiError, 'users')
              : 'An unexpected error occurred while searching GitHub.'}
          </p>
          {apiError?.kind === 'rate_limit' && apiError.resetAt && (
            <p>Try again after {formatAbsoluteDate(apiError.resetAt)}.</p>
          )}
          <button
            disabled={userQuery.isFetching}
            onClick={() => {
              void userQuery.refetch()
            }}
            type="button"
          >
            Retry
          </button>
        </section>
      ) : mode === 'repos' &&
        repoQuery.data?.items.length === 0 &&
        repoQuery.data.totalCount === 0 ? (
        <section aria-labelledby="no-results-title" className="state-panel">
          <h2 id="no-results-title">No repositories found</h2>
          <p>Check the spelling or try a broader search.</p>
        </section>
      ) : mode === 'repos' &&
        repoQuery.data?.items.length === 0 &&
        repoQuery.data.totalCount > 0 ? (
        <section aria-labelledby="empty-page-title" className="state-panel">
          <h2 id="empty-page-title">No repositories on this page</h2>
          <p>
            GitHub returned no items for this page. You can return to the first
            page or refine the search.
          </p>
          <button onClick={() => handlePageChange(1)} type="button">
            Go to page 1
          </button>
        </section>
      ) : mode === 'users' &&
        userQuery.data?.items.length === 0 &&
        userQuery.data.totalCount === 0 ? (
        <section aria-labelledby="no-users-title" className="state-panel">
          <h2 id="no-users-title">No users found</h2>
          <p>Check the spelling or try a broader search.</p>
        </section>
      ) : mode === 'users' &&
        userQuery.data?.items.length === 0 &&
        userQuery.data.totalCount > 0 ? (
        <section
          aria-labelledby="empty-user-page-title"
          className="state-panel"
        >
          <h2 id="empty-user-page-title">No users on this page</h2>
          <p>
            GitHub returned no items for this page. You can return to the first
            page or refine the search.
          </p>
          <button onClick={() => handlePageChange(1)} type="button">
            Go to page 1
          </button>
        </section>
      ) : mode === 'repos' && repoQuery.data ? (
        <section aria-labelledby="results-title">
          <div
            aria-busy={repoQuery.isFetching}
            className={
              repoQuery.isFetching
                ? 'results-content is-updating'
                : 'results-content'
            }
          >
            <h2 id="results-title" ref={resultsHeading} tabIndex={-1}>
              Repository results{' '}
              <span className="result-count">
                ({repoQuery.data.totalCount.toLocaleString()})
              </span>
            </h2>
            {repoQuery.data.totalCount > repoQuery.data.reachableCount && (
              <p className="cap-notice">
                GitHub search can return up to 1,000 results. Refine your search
                to reach more repositories.
              </p>
            )}
            <div className="repo-list">
              {repoQuery.data.items.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          </div>
          <Pagination
            onPageChange={handlePageChange}
            page={page}
            totalPages={repoQuery.data.totalPages}
          />
          {repoQuery.isError && apiError?.kind !== 'aborted' && (
            <div className="inline-error" role="alert">
              <p>
                {apiError
                  ? getErrorMessage(apiError, 'repositories')
                  : 'Could not refresh repository results.'}
              </p>
              {apiError?.kind === 'rate_limit' && apiError.resetAt && (
                <p>Try again after {formatAbsoluteDate(apiError.resetAt)}.</p>
              )}
              <button
                onClick={() => {
                  void repoQuery.refetch()
                }}
                type="button"
              >
                Retry
              </button>
            </div>
          )}
        </section>
      ) : mode === 'users' && userQuery.data ? (
        <section aria-labelledby="users-results-title">
          <div
            aria-busy={userQuery.isFetching}
            className={
              userQuery.isFetching
                ? 'results-content is-updating'
                : 'results-content'
            }
          >
            <h2 id="users-results-title" ref={resultsHeading} tabIndex={-1}>
              User results{' '}
              <span className="result-count">
                ({userQuery.data.totalCount.toLocaleString()})
              </span>
            </h2>
            <UserResults
              key={`${urlQuery}:${page}`}
              onPageChange={handlePageChange}
              page={page}
              results={userQuery.data}
            />
          </div>
          {userQuery.isError && apiError?.kind !== 'aborted' && (
            <div className="inline-error" role="alert">
              <p>
                {apiError
                  ? getErrorMessage(apiError, 'users')
                  : 'Could not refresh user results.'}
              </p>
              {apiError?.kind === 'rate_limit' && apiError.resetAt && (
                <p>Try again after {formatAbsoluteDate(apiError.resetAt)}.</p>
              )}
              <button
                onClick={() => {
                  void userQuery.refetch()
                }}
                type="button"
              >
                Retry
              </button>
            </div>
          )}
        </section>
      ) : null}

      {mode === 'repos' && (
        <p className="search-footnote">
          Open issue counts follow GitHub’s repository total, which includes
          open pull requests.
        </p>
      )}
    </section>
  )
}

function getErrorMessage(error: ApiError, subject: string): string {
  switch (error.kind) {
    case 'network':
      return 'GitHub could not be reached. Check your connection and try again.'
    case 'rate_limit':
      return 'GitHub is temporarily rate limiting search requests.'
    case 'validation':
      return 'GitHub could not interpret this search. Try changing the query.'
    case 'not_found':
      return `GitHub could not find matching ${subject}.`
    case 'server':
      return 'GitHub is having trouble completing this request.'
    case 'aborted':
      return 'The search request was cancelled.'
    case 'unknown':
      return error.message
  }
}
