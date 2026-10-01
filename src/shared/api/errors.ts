export type ApiErrorKind =
  | 'network'
  | 'rate_limit'
  | 'not_found'
  | 'validation'
  | 'server'
  | 'aborted'
  | 'unknown'
export type RateLimitBucket = 'search' | 'core'

type ApiErrorOptions = {
  kind: ApiErrorKind
  message: string
  status?: number
  resetAt?: Date
  bucket?: RateLimitBucket
  cause?: unknown
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  readonly resetAt: Date | undefined
  readonly bucket: RateLimitBucket | undefined

  constructor({
    kind,
    message,
    status,
    resetAt,
    bucket,
    cause,
  }: ApiErrorOptions) {
    super(message, { cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.resetAt = resetAt
    this.bucket = bucket
  }
}

export async function classifyApiError(
  source: unknown,
  requestUrl = '',
): Promise<ApiError> {
  if (source instanceof ApiError) return source
  if (!isResponse(source)) return classifyFetchFailure(source)
  const response = source
  const message = await readErrorMessage(response)
  const status = response.status
  const remaining = response.headers.get('x-ratelimit-remaining')
  const retryAfter = response.headers.get('retry-after')

  if (status === 429 || (status === 403 && remaining === '0')) {
    return new ApiError({
      kind: 'rate_limit',
      message,
      status,
      resetAt: parseResetAt(
        response.headers.get('x-ratelimit-reset'),
        retryAfter,
      ),
      bucket: requestUrl.includes('/search/') ? 'search' : 'core',
    })
  }
  if (status === 404)
    return new ApiError({ kind: 'not_found', message, status })
  if (status === 422)
    return new ApiError({ kind: 'validation', message, status })
  if (status >= 500) return new ApiError({ kind: 'server', message, status })
  return new ApiError({ kind: 'unknown', message, status })
}

function isResponse(value: unknown): value is Response {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof value.status === 'number' &&
    'headers' in value &&
    'clone' in value &&
    typeof value.clone === 'function'
  )
}

export function classifyFetchFailure(error: unknown): ApiError {
  if (hasErrorName(error, 'AbortError')) {
    return new ApiError({
      kind: 'aborted',
      message: 'The request was cancelled.',
      cause: error,
    })
  }
  if (error instanceof TypeError) {
    return new ApiError({
      kind: 'network',
      message: 'Unable to reach GitHub. Check your connection and try again.',
      cause: error,
    })
  }
  return new ApiError({
    kind: 'unknown',
    message: 'An unexpected API error occurred.',
    cause: error,
  })
}

function hasErrorName(value: unknown, name: string): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    value.name === name
  )
}

function parseResetAt(
  resetHeader: string | null,
  retryAfter: string | null,
): Date | undefined {
  if (resetHeader) {
    const timestamp = Number(resetHeader)
    if (Number.isFinite(timestamp)) return new Date(timestamp * 1000)
  }
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) return new Date(Date.now() + seconds * 1000)
    const date = new Date(retryAfter)
    if (!Number.isNaN(date.getTime())) return date
  }
  return undefined
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.clone().json()
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      return body.message
    }
  } catch {
    // Error responses are not guaranteed to contain JSON.
  }
  return `GitHub API request failed with status ${response.status}.`
}
