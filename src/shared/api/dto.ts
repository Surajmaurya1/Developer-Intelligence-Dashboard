export type GitHubUserDto = {
  id: number
  login: string
  avatar_url: string
  html_url: string
}

export type GitHubUserDetailDto = GitHubUserDto & {
  name: string | null
  location: string | null
  followers: number
  following: number
  public_repos: number
}

export type GitHubRepoDto = {
  id: number
  name: string
  full_name: string
  description: string | null
  owner: GitHubUserDto
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  subscribers_count?: number
  created_at: string
  updated_at: string
  default_branch: string
  topics?: string[]
}

export type GitHubIssueDto = {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  user: GitHubUserDto | null
  html_url: string
  created_at: string
  updated_at: string
  pull_request?: { url: string } | null
}

export type GitHubSearchResponseDto<T> = {
  total_count: number
  incomplete_results: boolean
  items: T[]
}
