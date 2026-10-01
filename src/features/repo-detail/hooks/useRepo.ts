import { useQuery } from '@tanstack/react-query'
import { getRepo } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/queryKeys'

export function useRepo(owner: string, name: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.repository(owner, name),
    queryFn: ({ signal }) => getRepo(owner, name, signal),
    enabled: enabled && Boolean(owner) && Boolean(name),
  })
}
