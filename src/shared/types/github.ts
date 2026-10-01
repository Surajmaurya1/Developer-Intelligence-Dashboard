export type Repo = {
  id: number
  name: string
  fullName: string
  description: string | null
  owner: Pick<User, 'login' | 'avatarUrl' | 'htmlUrl'>
  htmlUrl: string
  language: string | null
  stars: number
  forks: number
  openIssues: number
  watchers: number | null
  createdAt: string
  updatedAt: string
  defaultBranch: string
  topics: string[]
}

export type User = {
  id: number
  login: string
  avatarUrl: string
  htmlUrl: string
}

export type UserDetail = User & {
  name: string | null
  location: string | null
  followers: number
  following: number
  publicRepos: number
}

export type Issue = {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  author: User | null
  htmlUrl: string
  createdAt: string
  updatedAt: string
}

export type Paginated<T> = {
  items: T[]
  totalCount: number
  incompleteResults: boolean
  page: number
  perPage: number
  reachableCount: number
  totalPages: number
}
