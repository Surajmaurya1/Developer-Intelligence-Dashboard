import { useQuery } from '@tanstack/react-query'
import { getRepoIssues } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/queryKeys'

const ISSUE_PAGE_SIZE = 100

export function useRepoIssues(owner: string, name: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.repositoryIssues(owner, name, ISSUE_PAGE_SIZE),
    queryFn: ({ signal }) =>
      getRepoIssues(owner, name, ISSUE_PAGE_SIZE, signal),
    enabled: enabled && Boolean(owner) && Boolean(name),
  })
}
