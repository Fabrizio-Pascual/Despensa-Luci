'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useFavorites } from '@/lib/hooks/useFavorites'

interface FavoritesContextType {
  favorites: string[]
  loading: boolean
  isFavorite: (productId: string) => boolean
  toggleFavorite: (productId: string) => Promise<void>
  addFavorite: (productId: string) => Promise<void>
  removeFavorite: (productId: string) => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const favorites = useFavorites()

  return (
    <FavoritesContext.Provider value={favorites}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavoritesContext() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavoritesContext must be used within FavoritesProvider')
  }
  return context
}