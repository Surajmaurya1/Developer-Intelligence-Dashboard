// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildUrl,
  githubFetch,
  GITHUB_ACCEPT,
  GITHUB_API_VERSION,
} from '@/shared/api/client'
import { ApiError } from '@/shared/api/errors'

afterEach(() => vi.unstubAllGlobals())

describe('GitHub API client', () => {
  it('builds encoded URLs and omits empty query params', () => {
    expect(
      buildUrl('/search/repositories', {
        q: 'hello world',
        page: 2,
        missing: null,
        blank: '',
      }),
    ).toBe('https://api.github.com/search/repositories?q=hello+world&page=2')
  })

  it('sends required headers, params, and abort signal', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ total_count: 0 }), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await githubFetch('/search/users', {
      params: { q: 'octocat' },
      signal: controller.signal,
    })
    const invocation = fetchMock.mock.calls[0]
    if (!invocation) throw new Error('Expected fetch to be called')
    const [url, init] = invocation as [string, RequestInit]
    expect(url).toContain('q=octocat')
    expect(new Headers(init.headers).get('accept')).toBe(GITHUB_ACCEPT)
    expect(new Headers(init.headers).get('x-github-api-version')).toBe(
      GITHUB_API_VERSION,
    )
    expect(init.signal).toBe(controller.signal)
  })

  it('classifies non-JSON API error responses safely', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })),
    )
    await expect(githubFetch('/repos/a/b')).rejects.toMatchObject({
      kind: 'server',
      status: 503,
    })
  })

  it('classifies a fetch rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(githubFetch('/repos/a/b')).rejects.toBeInstanceOf(ApiError)
    await expect(githubFetch('/repos/a/b')).rejects.toMatchObject({
      kind: 'network',
    })
  })
})
