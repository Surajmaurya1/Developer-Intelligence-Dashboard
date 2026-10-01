// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { queryRetryDelay, shouldRetryQuery } from '@/shared/api/retryPolicy'

describe('query retry policy', () => {
  it('retries network and server errors at most twice', () => {
    expect(
      shouldRetryQuery(
        0,
        new ApiError({ kind: 'network', message: 'offline' }),
      ),
    ).toBe(true)
    expect(
      shouldRetryQuery(
        1,
        new ApiError({ kind: 'server', message: 'unavailable' }),
      ),
    ).toBe(true)
    expect(
      shouldRetryQuery(
        2,
        new ApiError({ kind: 'server', message: 'unavailable' }),
      ),
    ).toBe(false)
  })

  it('never retries other API kinds or HTTP client errors', () => {
    for (const kind of [
      'rate_limit',
      'not_found',
      'validation',
      'aborted',
      'unknown',
    ] as const) {
      expect(
        shouldRetryQuery(0, new ApiError({ kind, message: 'failed' })),
      ).toBe(false)
    }
    expect(
      shouldRetryQuery(
        0,
        new ApiError({ kind: 'unknown', message: 'bad request', status: 422 }),
      ),
    ).toBe(false)
  })

  it('uses a bounded exponential backoff', () => {
    expect(queryRetryDelay(0)).toBe(1000)
    expect(queryRetryDelay(3)).toBe(8000)
    expect(queryRetryDelay(7)).toBe(8000)
  })
})
