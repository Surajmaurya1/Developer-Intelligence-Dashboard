export const queryKeys = {
  all: ['github'] as const,
  repositorySearch: (query: string, page: number, perPage: number) =>
    ['github', 'repositories', query, page, perPage] as const,
  userSearch: (query: string, page: number, perPage: number) =>
    ['github', 'users', query, page, perPage] as const,
  user: (username: string) =>
    ['github', 'user', username.toLowerCase()] as const,
  repository: (owner: string, name: string) =>
    ['github', 'repository', owner.toLowerCase(), name.toLowerCase()] as const,
  repositoryIssues: (owner: string, name: string, perPage: number) =>
    [
      'github',
      'repository-issues',
      owner.toLowerCase(),
      name.toLowerCase(),
      perPage,
    ] as const,
}
