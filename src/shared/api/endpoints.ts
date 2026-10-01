import type {
  GitHubIssueDto,
  GitHubRepoDto,
  GitHubSearchResponseDto,
  GitHubUserDetailDto,
  GitHubUserDto,
} from '@/shared/api/dto'
import { githubFetch } from '@/shared/api/client'
import { mapIssue, mapRepo, mapUser, mapUserDetail } from '@/shared/api/mappers'
import type {
  Issue,
  Paginated,
  Repo,
  User,
  UserDetail,
} from '@/shared/types/github'

export type SearchParams = { query: string; page?: number; perPage?: number }
const MAX_PER_PAGE = 100

function normalizePagination(params: SearchParams): {
  page: number
  perPage: number
} {
  const page =
    params.page !== undefined &&
    Number.isSafeInteger(params.page) &&
    params.page > 0
      ? params.page
      : 1
  const requestedPerPage =
    params.perPage !== undefined &&
    Number.isSafeInteger(params.perPage) &&
    params.perPage > 0
      ? params.perPage
      : 30
  return { page, perPage: Math.min(requestedPerPage, MAX_PER_PAGE) }
}

export async function searchRepositories(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<Paginated<Repo>> {
  const { page, perPage } = normalizePagination(params)
  const response = await githubFetch<GitHubSearchResponseDto<GitHubRepoDto>>(
    '/search/repositories',
    {
      params: { q: params.query, page, per_page: perPage },
      signal,
    },
  )
  return mapPage(response, page, perPage, mapRepo)
}

export async function searchUsers(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<Paginated<User>> {
  const { page, perPage } = normalizePagination(params)
  const response = await githubFetch<GitHubSearchResponseDto<GitHubUserDto>>(
    '/search/users',
    {
      params: { q: params.query, page, per_page: perPage },
      signal,
    },
  )
  return mapPage(response, page, perPage, mapUser)
}

export async function getUser(
  username: string,
  signal?: AbortSignal,
): Promise<UserDetail> {
  return mapUserDetail(
    await githubFetch<GitHubUserDetailDto>(
      `/users/${encodeURIComponent(username)}`,
      { signal },
    ),
  )
}

export async function getRepo(
  owner: string,
  name: string,
  signal?: AbortSignal,
): Promise<Repo> {
  return mapRepo(
    await githubFetch<GitHubRepoDto>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      { signal },
    ),
  )
}

export async function getRepoIssues(
  owner: string,
  name: string,
  perPage = 100,
  signal?: AbortSignal,
): Promise<Issue[]> {
  const requestedPageSize = Number.isFinite(perPage)
    ? Math.floor(perPage)
    : MAX_PER_PAGE
  const pageSize = Math.min(MAX_PER_PAGE, Math.max(1, requestedPageSize))
  const recentIssues: Issue[] = []
  const maximumPages = 5

  for (let page = 1; page <= maximumPages; page += 1) {
    const response = await githubFetch<GitHubIssueDto[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues`,
      {
        params: {
          state: 'all',
          sort: 'updated',
          direction: 'desc',
          per_page: pageSize,
          page,
        },
        signal,
      },
    )
    recentIssues.push(
      ...response.flatMap((item) => {
        const issue = mapIssue(item)
        return issue ? [issue] : []
      }),
    )
    if (recentIssues.length >= 20 || response.length < pageSize) break
  }

  return recentIssues.slice(0, 20)
}

function mapPage<TDto, TDomain>(
  response: GitHubSearchResponseDto<TDto>,
  page: number,
  perPage: number,
  mapper: (dto: TDto) => TDomain,
): Paginated<TDomain> {
  const reachableCount = Math.min(response.total_count, 1000)
  return {
    items: response.items.map(mapper),
    totalCount: response.total_count,
    incompleteResults: response.incomplete_results,
    page,
    perPage,
    reachableCount,
    totalPages: Math.ceil(reachableCount / perPage),
  }
}
