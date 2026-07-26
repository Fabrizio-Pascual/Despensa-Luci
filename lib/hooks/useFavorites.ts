'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'

export function useFavorites() {
  const { user } = useAuth()
  const supabase = createClient()
  const [favorites, setFavorites] = useState<string[]>([]) // Array de product_ids
  const [loading, setLoading] = useState(true)

  // Cargar favoritos al montar
  useEffect(() => {
    if (!user) {
      // Si no hay user, cargar del localStorage (anónimo)
      const localFavs = localStorage.getItem('favorites')
      setFavorites(localFavs ? JSON.parse(localFavs) : [])
      setLoading(false)
      return
    }

    // Si hay user, cargar de Supabase
    loadFavoritesFromDB()
  }, [user])

  const loadFavoritesFromDB = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('product_id')
        .eq('user_id', user.id)

      if (error) throw error
      setFavorites(data?.map((f: { product_id: string }) => f.product_id) || [])
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const isFavorite = useCallback((productId: string) => {
    return favorites.includes(productId)
  }, [favorites])

  const toggleFavorite = useCallback(async (productId: string) => {
    if (isFavorite(productId)) {
      // Remover favorito
      await removeFavorite(productId)
    } else {
      // Agregar favorito
      await addFavorite(productId)
    }
  }, [favorites, user])

  const addFavorite = async (productId: string) => {
    if (!user) {
      // Guardar en localStorage si no hay user
      const updated = [...favorites, productId]
      setFavorites(updated)
      localStorage.setItem('favorites', JSON.stringify(updated))
      return
    }

    try {
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, product_id: productId })

      if (error) throw error
      setFavorites([...favorites, productId])
    } catch (error) {
      console.error('Error adding favorite:', error)
    }
  }

  const removeFavorite = async (productId: string) => {
    if (!user) {
      // Remover de localStorage
      const updated = favorites.filter(id => id !== productId)
      setFavorites(updated)
      localStorage.setItem('favorites', JSON.stringify(updated))
      return
    }

    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)

      if (error) throw error
      setFavorites(favorites.filter(id => id !== productId))
    } catch (error) {
      console.error('Error removing favorite:', error)
    }
  }

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite
  }
}