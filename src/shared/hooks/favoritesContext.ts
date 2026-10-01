import { createContext } from 'react'
import type { Repo } from '@/shared/types/github'

export type FavoritesContextValue = {
  favorites: Repo[]
  isFavorite: (fullName: string) => boolean
  toggleFavorite: (repo: Repo) => void
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(
  null,
)
