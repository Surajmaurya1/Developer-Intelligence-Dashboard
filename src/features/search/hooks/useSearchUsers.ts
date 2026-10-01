import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { searchUsers } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/queryKeys'
import { normalizeSearchQuery } from '@/shared/lib/searchParams'

const RESULTS_PER_PAGE = 30

export function useSearchUsers(query: string, page: number) {
  const normalizedQuery = normalizeSearchQuery(query)

  return useQuery({
    queryKey: queryKeys.userSearch(normalizedQuery, page, RESULTS_PER_PAGE),
    queryFn: ({ signal }) =>
      searchUsers(
        { query: normalizedQuery, page, perPage: RESULTS_PER_PAGE },
        signal,
      ),
    enabled: normalizedQuery.length > 0,
    placeholderData: keepPreviousData,
  })
}
