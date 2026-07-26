'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProductCarousel } from '@/components/product-carousel'
import type { Product } from '@/lib/types'

interface RecommendationsCarouselProps {
  type: 'recent' | 'trending' | 'popular'
  title: string
  limit?: number
}

export function RecommendationsCarousel({
  type,
  title,
  limit = 12
}: RecommendationsCarouselProps) {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecommendations()
  }, [type])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('products')
        .select('*, category:categories(name, slug)')
        .eq('is_active', true)
        .gt('stock', 0)

      if (type === 'recent') {
        query = query.order('created_at', { ascending: false }).limit(limit)
      } else if (type === 'trending') {
        // Productos con más favoritos
        query = supabase
          .from('top_products_view')
          .select('*')
          .order('favorite_count', { ascending: false })
          .limit(limit)
      } else if (type === 'popular') {
        // Productos con mejor rating
        query = supabase
          .from('top_products_view')
          .select('*')
          .order('avg_rating', { ascending: false })
          .limit(limit)
      }

      const { data, error } = await query

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-4" />
        <div className="h-64 bg-muted rounded" />
      </div>
    )
  }

  if (!products.length) return null

  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <ProductCarousel products={products} />
    </section>
  )
}