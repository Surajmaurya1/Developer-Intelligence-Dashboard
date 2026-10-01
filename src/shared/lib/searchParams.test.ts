import { describe, expect, it } from 'vitest'
import {
  buildRepositorySearchQuery,
  createSearchParams,
  normalizeSearchQuery,
  parseMinimumStars,
  parsePositiveInteger,
  parseSearchMode,
} from '@/shared/lib/searchParams'

describe('search parameter helpers', () => {
  it('normalizes whitespace and defaults invalid URL state', () => {
    expect(normalizeSearchQuery('  react   hooks  ')).toBe('react hooks')
    expect(parseSearchMode('other')).toBe('repos')
    expect(parseSearchMode('users')).toBe('users')
    expect(parsePositiveInteger('0', 1)).toBe(1)
    expect(parsePositiveInteger('3', 1)).toBe(3)
  })

  it('writes normalized URL params and omits the default page', () => {
    expect(
      createSearchParams({
        mode: 'repos',
        query: ' react ',
        page: 1,
      }).toString(),
    ).toBe('mode=repos&q=react')
    expect(
      createSearchParams({ mode: 'users', query: '', page: 4 }).toString(),
    ).toBe('mode=users&page=4')
  })

  it('parses and composes safe repository search filters', () => {
    expect(parseMinimumStars('500')).toBe(500)
    expect(parseMinimumStars('-2')).toBeNull()
    expect(parseMinimumStars('1.5')).toBeNull()
    expect(buildRepositorySearchQuery('react hooks', 'TypeScript', 500)).toBe(
      'react hooks language:TypeScript stars:>=500',
    )
    expect(buildRepositorySearchQuery('react', '', null)).toBe('react')
  })
})
