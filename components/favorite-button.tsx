'use client'

import { Heart } from 'lucide-react'
import { useFavoritesContext } from '@/components/favorites-context'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'

interface FavoriteButtonProps {
  productId: string
  className?: string
}

export function FavoriteButton({ productId, className = '' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, loading } = useFavoritesContext()
  const { user } = useAuth()
  const router = useRouter()
  const isLiked = isFavorite(productId)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      router.push('/auth/login')
      return
    }

    await toggleFavorite(productId)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`relative p-2 rounded-lg transition-all hover:scale-110 ${
        isLiked ? 'bg-primary/10' : 'bg-muted/50 hover:bg-muted'
      } ${className}`}
      title={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Heart
        className={`h-5 w-5 transition-all ${
          isLiked
            ? 'fill-primary text-primary'
            : 'text-muted-foreground hover:text-primary'
        }`}
      />
    </button>
  )
}