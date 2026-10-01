// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRepoIssues, searchRepositories } from '@/shared/api/endpoints'

afterEach(() => vi.unstubAllGlobals())

describe('GitHub endpoints', () => {
  it('limits reachable search pagination to the API 1000-result cap', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            total_count: 1500,
            incomplete_results: false,
            items: [],
          }),
          { status: 200 },
        ),
      ),
    )

    await expect(
      searchRepositories({ query: 'react', page: 10, perPage: 100 }),
    ).resolves.toMatchObject({
      items: [],
      totalCount: 1500,
      page: 10,
      perPage: 100,
      reachableCount: 1000,
      totalPages: 10,
    })
  })

  it('caps page sizes at GitHub’s maximum', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          total_count: 0,
          incomplete_results: false,
          items: [],
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    await searchRepositories({ query: 'react', perPage: 200 })
    const invocation = fetchMock.mock.calls[0]
    if (!invocation) throw new Error('Expected fetch to be called')
    expect(String(invocation[0])).toContain('per_page=100')
  })

  it('filters pull requests returned by the issues endpoint', async () => {
    const issue = {
      id: 1,
      number: 1,
      title: 'A real issue',
      state: 'open',
      user: null,
      html_url: 'https://github.com/a/b/issues/1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    }
    const pullRequest = {
      ...issue,
      id: 2,
      number: 2,
      pull_request: { url: 'https://api.github.com/repos/a/b/pulls/2' },
    }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify([issue, pullRequest]), { status: 200 }),
        ),
    )

    const issues = await getRepoIssues('a', 'b')
    expect(issues).toHaveLength(1)
    expect(issues).toMatchObject([{ number: 1, title: 'A real issue' }])
  })

  it('checks later issue pages when pull requests leave the first page short of twenty issues', async () => {
    const toIssue = (number: number) => ({
      id: number,
      number,
      title: `Issue ${number}`,
      state: 'open',
      user: null,
      html_url: `https://github.com/a/b/issues/${number}`,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    })
    const firstPage = [
      ...Array.from({ length: 19 }, (_, index) => toIssue(index + 1)),
      ...Array.from({ length: 81 }, (_, index) => ({
        ...toIssue(index + 20),
        pull_request: {
          url: `https://api.github.com/repos/a/b/pulls/${index + 20}`,
        },
      })),
    ]
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const page = new URL(String(input)).searchParams.get('page')
      const body = page === '1' ? firstPage : [toIssue(101)]
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200 }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(getRepoIssues('a', 'b')).resolves.toHaveLength(20)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
