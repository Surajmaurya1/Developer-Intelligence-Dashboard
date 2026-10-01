export type SearchMode = 'repos' | 'users'

export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ')
}

export function parseSearchMode(value: string | null): SearchMode {
  return value === 'users' ? 'users' : 'repos'
}

export function parsePositiveInteger(
  value: string | null,
  fallback: number,
): number {
  if (value === null || !/^\d+$/.test(value)) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function parseMinimumStars(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

export function buildRepositorySearchQuery(
  query: string,
  language: string,
  minimumStars: number | null,
): string {
  return [
    normalizeSearchQuery(query),
    language ? `language:${language}` : '',
    minimumStars === null ? '' : `stars:>=${minimumStars}`,
  ]
    .filter(Boolean)
    .join(' ')
}

export function createSearchParams(input: {
  mode: SearchMode
  query: string
  page: number
}): URLSearchParams {
  const params = new URLSearchParams()
  params.set('mode', input.mode)
  const query = normalizeSearchQuery(input.query)
  if (query) params.set('q', query)
  if (input.page > 1) params.set('page', String(input.page))
  return params
}
