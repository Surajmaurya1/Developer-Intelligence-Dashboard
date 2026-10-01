import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Repo } from '@/shared/types/github'
import { FavoritesContext } from '@/shared/hooks/favoritesContext'

const STORAGE_KEY = 'developer-intelligence-favorites'

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState(readFavorites)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    } catch {
      // Keep the in-memory favorites usable when browser storage is unavailable.
    }
  }, [favorites])

  const toggleFavorite = useCallback((repo: Repo) => {
    setFavorites((current) => {
      return current.some((favorite) => favorite.fullName === repo.fullName)
        ? current.filter((favorite) => favorite.fullName !== repo.fullName)
        : [repo, ...current]
    })
  }, [])

  const isFavorite = useCallback(
    (fullName: string) => favorites.some((repo) => repo.fullName === fullName),
    [favorites],
  )
  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite }),
    [favorites, isFavorite, toggleFavorite],
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

function readFavorites(): Repo[] {
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '[]',
    )
    return Array.isArray(stored) ? stored.filter(isRepo) : []
  } catch {
    return []
  }
}

function isRepo(value: unknown): value is Repo {
  if (typeof value !== 'object' || value === null) return false
  const repo = value as Partial<Repo>
  const owner = repo.owner
  return (
    typeof repo.id === 'number' &&
    typeof repo.name === 'string' &&
    typeof repo.fullName === 'string' &&
    (typeof repo.description === 'string' || repo.description === null) &&
    typeof repo.htmlUrl === 'string' &&
    (typeof repo.language === 'string' || repo.language === null) &&
    typeof repo.stars === 'number' &&
    typeof repo.forks === 'number' &&
    typeof repo.openIssues === 'number' &&
    (typeof repo.watchers === 'number' || repo.watchers === null) &&
    typeof repo.createdAt === 'string' &&
    typeof repo.updatedAt === 'string' &&
    typeof repo.defaultBranch === 'string' &&
    Array.isArray(repo.topics) &&
    repo.topics.every((topic) => typeof topic === 'string') &&
    typeof owner === 'object' &&
    owner !== null &&
    typeof owner.login === 'string' &&
    typeof owner.avatarUrl === 'string' &&
    typeof owner.htmlUrl === 'string'
  )
}
