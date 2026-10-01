import { useContext } from 'react'
import { FavoritesContext } from '@/shared/hooks/favoritesContext'
import type { FavoritesContextValue } from '@/shared/hooks/favoritesContext'

export function useFavorites(): FavoritesContextValue {
  const value = useContext(FavoritesContext)
  if (!value)
    throw new Error('useFavorites must be used within FavoritesProvider')
  return value
}
