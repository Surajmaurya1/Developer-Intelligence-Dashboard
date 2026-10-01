// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ApiError, classifyApiError } from '@/shared/api/errors'

describe('GitHub API error classification', () => {
  it('classifies rate limits and derives reset time and bucket', async () => {
    const error = await classifyApiError(
      new Response(JSON.stringify({ message: 'rate limited' }), {
        status: 403,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '2000000000',
        },
      }),
      'https://api.github.com/search/repositories',
    )
    expect(error.kind).toBe('rate_limit')
    expect(error.bucket).toBe('search')
    expect(error.resetAt?.getTime()).toBe(2_000_000_000_000)
  })

  it('uses retry-after for a 429 and detects the core bucket', async () => {
    const error = await classifyApiError(
      new Response('slow down', {
        status: 429,
        headers: { 'retry-after': '30' },
      }),
      'https://api.github.com/users/octocat',
    )
    expect(error.kind).toBe('rate_limit')
    expect(error.bucket).toBe('core')
    expect(error.resetAt).toBeInstanceOf(Date)
  })

  it.each([
    [404, 'not_found'],
    [422, 'validation'],
    [500, 'server'],
    [502, 'server'],
    [503, 'server'],
  ] as const)('classifies HTTP %i', async (status, kind) => {
    expect(
      (
        await classifyApiError(
          new Response('oops', { status }),
          'https://api.github.com/repos/a/b',
        )
      ).kind,
    ).toBe(kind)
  })

  it('does not treat an ordinary 403 as rate limiting without exhausted quota', async () => {
    expect(
      (
        await classifyApiError(
          new Response('forbidden', { status: 403 }),
          'https://api.github.com/users/a',
        )
      ).kind,
    ).toBe('unknown')
  })

  it('classifies network and abort failures', async () => {
    expect((await classifyApiError(new TypeError('offline'))).kind).toBe(
      'network',
    )
    expect(
      (await classifyApiError(new DOMException('cancelled', 'AbortError')))
        .kind,
    ).toBe('aborted')
    expect(new ApiError({ kind: 'unknown', message: 'x' }).kind).toBe('unknown')
  })
})
