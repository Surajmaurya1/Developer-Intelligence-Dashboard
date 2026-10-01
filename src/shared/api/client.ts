import { classifyApiError } from '@/shared/api/errors'

export const GITHUB_API_BASE_URL = 'https://api.github.com'
export const GITHUB_ACCEPT = 'application/vnd.github+json'
export const GITHUB_API_VERSION = '2022-11-28'

export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue>

export function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(path.replace(/^\//, ''), `${GITHUB_API_BASE_URL}/`)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '')
      url.searchParams.set(key, String(value))
  }
  return url.toString()
}

export async function githubFetch<T>(
  path: string,
  options: { params?: QueryParams; signal?: AbortSignal } = {},
): Promise<T> {
  const url = buildUrl(path, options.params)
  let response: Response

  try {
    response = await fetch(url, {
      headers: {
        Accept: GITHUB_ACCEPT,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
      signal: options.signal,
    })
  } catch (error) {
    throw await classifyApiError(error, url)
  }

  if (!response.ok) throw await classifyApiError(response, url)

  try {
    return (await response.json()) as T
  } catch (error) {
    throw await classifyApiError(error, url)
  }
}
