import type {
  GitHubIssueDto,
  GitHubRepoDto,
  GitHubUserDetailDto,
  GitHubUserDto,
} from '@/shared/api/dto'
import type { Issue, Repo, User, UserDetail } from '@/shared/types/github'

export function mapUser(dto: GitHubUserDto): User {
  return {
    id: dto.id,
    login: dto.login,
    avatarUrl: dto.avatar_url,
    htmlUrl: dto.html_url,
  }
}

export function mapUserDetail(dto: GitHubUserDetailDto): UserDetail {
  return {
    ...mapUser(dto),
    name: dto.name,
    location: dto.location,
    followers: dto.followers,
    following: dto.following,
    publicRepos: dto.public_repos,
  }
}

export function mapRepo(dto: GitHubRepoDto): Repo {
  return {
    id: dto.id,
    name: dto.name,
    fullName: dto.full_name,
    description: dto.description,
    owner: mapUser(dto.owner),
    htmlUrl: dto.html_url,
    language: dto.language,
    stars: dto.stargazers_count,
    forks: dto.forks_count,
    openIssues: dto.open_issues_count,
    watchers: dto.subscribers_count ?? null,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    defaultBranch: dto.default_branch,
    topics: dto.topics ?? [],
  }
}

export function mapIssue(dto: GitHubIssueDto): Issue | null {
  if (dto.pull_request) return null
  return {
    id: dto.id,
    number: dto.number,
    title: dto.title,
    state: dto.state,
    author: dto.user ? mapUser(dto.user) : null,
    htmlUrl: dto.html_url,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}
