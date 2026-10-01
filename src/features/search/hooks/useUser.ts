import { useQuery } from '@tanstack/react-query'
import { getUser } from '@/shared/api/endpoints'
import { classifyApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'
import { withUserDetailConcurrency } from '@/shared/api/userDetailQueue'

export function useUser(username: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.user(username),
    queryFn: async ({ signal }) => {
      try {
        return await withUserDetailConcurrency(signal, () =>
          getUser(username, signal),
        )
      } catch (error) {
        throw await classifyApiError(error)
      }
    },
    enabled,
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
  })
}
