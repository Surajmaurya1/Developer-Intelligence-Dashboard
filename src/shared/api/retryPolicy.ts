import { ApiError } from '@/shared/api/errors'

export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (error instanceof ApiError) {
    if (error.kind !== 'network' && error.kind !== 'server') return false
    return failureCount < 2
  }
  return false
}

export function queryRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 8000)
}
