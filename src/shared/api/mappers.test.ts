// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { mapIssue, mapRepo, mapUserDetail } from '@/shared/api/mappers'
import type {
  GitHubIssueDto,
  GitHubRepoDto,
  GitHubUserDetailDto,
} from '@/shared/api/dto'

const user = {
  id: 1,
  login: 'octocat',
  avatar_url: 'https://example.test/avatar.png',
  html_url: 'https://github.com/octocat',
}

describe('GitHub DTO mappers', () => {
  it('maps nullable user details', () => {
    const detail: GitHubUserDetailDto = {
      ...user,
      name: null,
      location: null,
      followers: 2,
      following: 3,
      public_repos: 4,
    }
    expect(mapUserDetail(detail)).toMatchObject({
      name: null,
      location: null,
      publicRepos: 4,
    })
  })

  it('uses subscribers for watchers and tolerates missing topics and null fields', () => {
    const repo: GitHubRepoDto = {
      id: 2,
      name: 'repo',
      full_name: 'octocat/repo',
      description: null,
      owner: user,
      html_url: 'https://github.com/octocat/repo',
      language: null,
      stargazers_count: 10,
      forks_count: 2,
      open_issues_count: 3,
      subscribers_count: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      default_branch: 'main',
    }
    expect(mapRepo(repo)).toMatchObject({
      description: null,
      language: null,
      watchers: 1,
      topics: [],
    })
  })

  it('filters pull requests from issue results and accepts missing authors', () => {
    const issue: GitHubIssueDto = {
      id: 3,
      number: 4,
      title: 'issue',
      state: 'open',
      user: null,
      html_url: 'https://github.com/a/b/issues/4',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    }
    expect(
      mapIssue({
        ...issue,
        pull_request: { url: 'https://api.github.com/repos/a/b/pulls/4' },
      }),
    ).toBeNull()
    expect(mapIssue(issue)?.author).toBeNull()
  })
})
