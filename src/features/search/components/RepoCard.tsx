import { Link, useLocation } from 'react-router-dom'
import type { Repo } from '@/shared/types/github'
import {
  formatCompactNumber,
  formatRelativeDate,
} from '@/shared/lib/formatters'
import { useFavorites } from '@/shared/hooks/useFavorites'
import { SpotlightCard } from '@/shared/ui/easyui/SpotlightCard'

type RepoCardProps = { repo: Repo }

export function RepoCard({ repo }: RepoCardProps) {
  const location = useLocation()
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(repo.fullName)

  return (
    <SpotlightCard className="repo-card-spotlight">
      <article className="repo-card">
        <div className="repo-card-owner">
          <img
            alt={`${repo.owner.login} avatar`}
            height={32}
            loading="lazy"
            src={repo.owner.avatarUrl}
            width={32}
          />
          <span>{repo.owner.login}</span>
        </div>
        <h3>
          <Link
            state={{ returnTo: `${location.pathname}${location.search}` }}
            to={`/repo/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}`}
          >
            {repo.name}
          </Link>
        </h3>
        <button
          aria-label={
            favorite
              ? `Remove ${repo.fullName} from favorites`
              : `Add ${repo.fullName} to favorites`
          }
          aria-pressed={favorite}
          className="favorite-toggle"
          onClick={() => toggleFavorite(repo)}
          type="button"
        >
          {favorite ? 'Remove from favorites' : 'Add to favorites'}
        </button>
        <p className="repo-description">
          {repo.description ?? 'No description provided.'}
        </p>
        <ul
          aria-label={`${repo.fullName} repository statistics`}
          className="repo-stats"
        >
          <li>{repo.language ?? 'Language not specified'}</li>
          <li>{formatCompactNumber(repo.stars)} stars</li>
          <li>{formatCompactNumber(repo.forks)} forks</li>
          <li>{formatCompactNumber(repo.openIssues)} open issues</li>
          <li>
            <time
              dateTime={repo.updatedAt}
              title={new Date(repo.updatedAt).toLocaleString()}
            >
              Updated {formatRelativeDate(repo.updatedAt)}
            </time>
          </li>
        </ul>
        <a
          aria-label={`View ${repo.fullName} on GitHub`}
          href={repo.htmlUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub repository <span aria-hidden="true">↗</span>
        </a>
      </article>
    </SpotlightCard>
  )
}