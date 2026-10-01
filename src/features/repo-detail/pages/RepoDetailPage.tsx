import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError } from '@/shared/api/errors'
import {
  formatAbsoluteDate,
  formatCompactNumber,
  formatRelativeDate,
} from '@/shared/lib/formatters'
import type { Issue, Repo } from '@/shared/types/github'
import { useRepo } from '@/features/repo-detail/hooks/useRepo'
import { useRepoIssues } from '@/features/repo-detail/hooks/useRepoIssues'

const DEFAULT_DOCUMENT_TITLE = 'Developer Intelligence Dashboard'

export default function RepoDetailPage() {
  const { owner: routeOwner, name: routeName } = useParams()
  const location = useLocation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const owner = routeOwner ?? ''
  const name = routeName ?? ''
  const isValidRoute = isValidRepositoryPath(owner, name)
  const repoQuery = useRepo(owner, name, isValidRoute)
  const issuesQuery = useRepoIssues(owner, name, isValidRoute)
  const returnTo = getReturnTo(location.state)
  const recentIssues = issuesQuery.data
    ? [...issuesQuery.data]
        .sort(
          (left, right) =>
            Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
        )
        .slice(0, 20)
    : []

  useEffect(() => {
    headingRef.current?.focus()
  }, [location.pathname])

  useEffect(() => {
    document.title = repoQuery.data
      ? `${repoQuery.data.fullName} · Developer Intelligence`
      : DEFAULT_DOCUMENT_TITLE
    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE
    }
  }, [repoQuery.data])

  if (!isValidRoute) {
    return (
      <section aria-labelledby="invalid-repo-title">
        <BackToSearch to={returnTo} />
        <h1 id="invalid-repo-title" ref={headingRef} tabIndex={-1}>
          Invalid repository address
        </h1>
        <p>The owner or repository name in this address is not valid.</p>
      </section>
    )
  }

  const repoError = repoQuery.error instanceof ApiError ? repoQuery.error : null
  const issueError =
    issuesQuery.error instanceof ApiError ? issuesQuery.error : null

  return (
    <div className="repo-detail-page">
      <BackToSearch to={returnTo} />
      <h1 id="repository-heading" ref={headingRef} tabIndex={-1}>
        {repoQuery.data?.name ?? `${owner}/${name}`}
      </h1>

      {repoQuery.isPending ? (
        <RepoDetailsSkeleton />
      ) : repoQuery.isError && repoError?.kind === 'not_found' ? (
        <section
          aria-labelledby="repo-not-found-title"
          className="state-panel error-panel"
          role="alert"
        >
          <h2 id="repo-not-found-title">Repository not found</h2>
          <p>Check the owner and repository name, or return to your search.</p>
          <button
            disabled={repoQuery.isFetching}
            onClick={() => {
              void repoQuery.refetch()
            }}
            type="button"
          >
            Retry repository details
          </button>
        </section>
      ) : repoQuery.isError &&
        !repoQuery.data &&
        repoError?.kind !== 'aborted' ? (
        <section
          aria-labelledby="repo-error-title"
          className="state-panel error-panel"
          role="alert"
        >
          <h2 id="repo-error-title">Couldn’t load repository details</h2>
          <p>{getErrorMessage(repoError)}</p>
          {repoError?.kind === 'rate_limit' && repoError.resetAt && (
            <p>Try again after {formatAbsoluteDate(repoError.resetAt)}.</p>
          )}
          <button
            disabled={repoQuery.isFetching}
            onClick={() => {
              void repoQuery.refetch()
            }}
            type="button"
          >
            Retry repository details
          </button>
        </section>
      ) : repoQuery.data ? (
        <>
          <RepoSummary repo={repoQuery.data} />
          {repoQuery.isError && repoError?.kind !== 'aborted' && (
            <div className="inline-error" role="alert">
              <p>{getErrorMessage(repoError)}</p>
              {repoError?.kind === 'rate_limit' && repoError.resetAt && (
                <p>Try again after {formatAbsoluteDate(repoError.resetAt)}.</p>
              )}
              <button
                onClick={() => {
                  void repoQuery.refetch()
                }}
                type="button"
              >
                Retry repository details
              </button>
            </div>
          )}
        </>
      ) : null}

      <section aria-labelledby="recent-issues-title" className="issues-section">
        <h2 id="recent-issues-title">Recent issues</h2>
        {issuesQuery.isPending ? (
          <IssuesSkeleton />
        ) : issuesQuery.isError &&
          !issuesQuery.data &&
          issueError?.kind !== 'aborted' ? (
          <div className="state-panel error-panel" role="alert">
            <p>{getErrorMessage(issueError)}</p>
            {issueError?.kind === 'rate_limit' && issueError.resetAt && (
              <p>Try again after {formatAbsoluteDate(issueError.resetAt)}.</p>
            )}
            <button
              disabled={issuesQuery.isFetching}
              onClick={() => {
                void issuesQuery.refetch()
              }}
              type="button"
            >
              Retry issues
            </button>
          </div>
        ) : recentIssues.length === 0 ? (
          <p className="state-panel">No issues found for this repository.</p>
        ) : (
          <>
            <ol className="issue-list">
              {recentIssues.map((issue) => (
                <IssueRow issue={issue} key={issue.id} />
              ))}
            </ol>
            {issuesQuery.isError && issueError?.kind !== 'aborted' && (
              <div className="inline-error" role="alert">
                <p>{getErrorMessage(issueError)}</p>
                {issueError?.kind === 'rate_limit' && issueError.resetAt && (
                  <p>
                    Try again after {formatAbsoluteDate(issueError.resetAt)}.
                  </p>
                )}
                <button
                  onClick={() => {
                    void issuesQuery.refetch()
                  }}
                  type="button"
                >
                  Retry issues
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function RepoSummary({ repo }: { repo: Repo }) {
  return (
    <section aria-labelledby="repo-summary-title" className="repo-summary">
      <h2 className="sr-only" id="repo-summary-title">
        Repository details
      </h2>
      {repo.description && (
        <p className="repo-detail-description">{repo.description}</p>
      )}
      <div className="repo-detail-owner">
        <img
          alt={`${repo.owner.login} avatar`}
          height={40}
          src={repo.owner.avatarUrl}
          width={40}
        />
        <a href={repo.owner.htmlUrl} rel="noopener noreferrer" target="_blank">
          {repo.owner.login}
        </a>
      </div>
      <dl className="repo-facts">
        <Fact label="Stars" value={formatCompactNumber(repo.stars)} />
        <Fact label="Forks" value={formatCompactNumber(repo.forks)} />
        <Fact
          label="Watchers"
          value={
            repo.watchers === null
              ? 'Not available'
              : formatCompactNumber(repo.watchers)
          }
        />
        <Fact
          label="Open issues"
          value={formatCompactNumber(repo.openIssues)}
        />
        <Fact label="Language" value={repo.language ?? 'Not specified'} />
        <Fact label="Default branch" value={repo.defaultBranch} />
        <Fact
          label="Created"
          value={
            <time dateTime={repo.createdAt} title={repo.createdAt}>
              {formatAbsoluteDate(repo.createdAt)}
            </time>
          }
        />
        <Fact
          label="Last updated"
          value={
            <time dateTime={repo.updatedAt} title={repo.updatedAt}>
              {formatAbsoluteDate(repo.updatedAt)}
            </time>
          }
        />
      </dl>
      <p className="detail-footnote">
        GitHub’s open issue count includes open pull requests; the issue list
        below excludes pull requests.
      </p>
      {repo.topics.length > 0 && (
        <ul aria-label="Repository topics" className="topic-list">
          {repo.topics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      )}
      <a
        aria-label={`View ${repo.fullName} on GitHub`}
        className="github-detail-link"
        href={repo.htmlUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        View on GitHub <span aria-hidden="true">↗</span>
      </a>
    </section>
  )
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="repo-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <li className="issue-card">
      <div className={`issue-state issue-state-${issue.state}`}>
        {issue.state === 'open' ? 'Open' : 'Closed'}
      </div>
      <div className="issue-content">
        <h3>
          <a href={issue.htmlUrl} rel="noopener noreferrer" target="_blank">
            {issue.title}
          </a>
        </h3>
        <p>
          <span>#{issue.number}</span>
          <span> · </span>
          {issue.author ? (
            <a
              href={issue.author.htmlUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {issue.author.login}
            </a>
          ) : (
            'Unknown author'
          )}
          <span> · Created </span>
          <time
            dateTime={issue.createdAt}
            title={formatAbsoluteDate(issue.createdAt)}
          >
            {formatAbsoluteDate(issue.createdAt)}
          </time>
          <span> · Updated </span>
          <time
            dateTime={issue.updatedAt}
            title={formatAbsoluteDate(issue.updatedAt)}
          >
            {formatRelativeDate(issue.updatedAt)}
          </time>
        </p>
      </div>
    </li>
  )
}

function RepoDetailsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading repository details"
      className="state-panel repo-detail-skeleton"
      role="region"
    >
      <span className="skeleton-line skeleton-description" />
      <span className="skeleton-line skeleton-title" />
      <span className="skeleton-line skeleton-stats" />
    </div>
  )
}

function IssuesSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading recent issues"
      className="issue-list-skeleton"
      role="region"
    >
      <span className="issue-skeleton" />
      <span className="issue-skeleton" />
      <span className="issue-skeleton" />
    </div>
  )
}

function BackToSearch({ to }: { to: string }) {
  return (
    <Link className="back-link" to={to}>
      ← Back to search
    </Link>
  )
}

function getReturnTo(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('returnTo' in state))
    return '/'
  const candidate = state.returnTo
  return typeof candidate === 'string' &&
    candidate.startsWith('/') &&
    !candidate.startsWith('//')
    ? candidate
    : '/'
}

function isValidRepositoryPath(owner: string, name: string): boolean {
  const isValidOwner = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(
    owner,
  )
  const isValidName =
    /^[A-Za-z0-9._-]{1,100}$/.test(name) && name !== '.' && name !== '..'
  return isValidOwner && isValidName
}

function getErrorMessage(error: ApiError | null): string {
  if (!error) return 'An unexpected error occurred while loading this section.'
  switch (error.kind) {
    case 'network':
      return 'GitHub could not be reached. Check your connection and try again.'
    case 'rate_limit':
      return 'GitHub is temporarily rate limiting this request.'
    case 'validation':
      return 'GitHub could not interpret this repository request.'
    case 'not_found':
      return 'GitHub could not find this repository.'
    case 'server':
      return 'GitHub is having trouble completing this request.'
    case 'aborted':
      return 'The request was cancelled.'
    case 'unknown':
      return error.message
  }
}
