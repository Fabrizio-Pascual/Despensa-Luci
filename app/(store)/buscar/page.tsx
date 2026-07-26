'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Filter, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductCard } from '@/components/product-card'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types'

type SortOption = 'newest' | 'popular' | 'price-asc' | 'price-desc' | 'rating'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const supabase = createClient()

  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortOption>('newest')
  const [searchInput, setSearchInput] = useState(query)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 1000,
    inStock: true
  })

  useEffect(() => {
    if (query) {
      performSearch()
    }
  }, [query, sort, filters])

  const performSearch = async () => {
    setLoading(true)
    try {
      let queryBuilder = supabase
        .from('products')
        .select('*, category:categories(name, slug)')
        .eq('is_active', true)

      // Filtrar por query
      if (query) {
        queryBuilder = queryBuilder.or(
          `name.ilike.%${query}%,description.ilike.%${query}%`
        )
      }

      // Filtro de stock
      if (filters.inStock) {
        queryBuilder = queryBuilder.gt('stock', 0)
      }

      // Filtro de precio (aproximado, mejor hacer en el cliente)
      const { data } = await queryBuilder

      // Filtrar y ordenar en cliente
      let filtered: Product[] = (data as Product[]) || []

      // Precio
      filtered = filtered.filter(
        (p: Product) => p.price >= filters.minPrice && p.price <= filters.maxPrice
      )

      // Ordenamiento
      if (sort === 'price-asc') {
        filtered.sort((a: Product, b: Product) => a.price - b.price)
      } else if (sort === 'price-desc') {
        filtered.sort((a: Product, b: Product) => b.price - a.price)
      } else if (sort === 'newest') {
        filtered.sort((a: Product, b: Product) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }

      setResults(filtered)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchInput) params.set('q', searchInput)
    window.history.replaceState({}, '', `/buscar?${params.toString()}`)
    setSearchInput(searchInput)
  }

  return (
    <div className="pb-20 md:pb-8">
      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { label: 'Búsqueda', href: '/buscar', current: true }
          ]}
        />
      </div>

      {/* Header */}
      <section className="container mx-auto px-4 mb-8">
        <h1 className="text-3xl font-bold mb-6">Buscar Productos</h1>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <Input
            type="text"
            placeholder="¿Qué buscas?"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 h-11"
          />
          <Button type="submit" size="lg" className="gap-2">
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </form>

        {/* Resultados Info */}
        {query && (
          <p className="text-muted-foreground mb-4">
            {loading ? 'Buscando...' : `${results.length} resultado${results.length !== 1 ? 's' : ''} para "${query}"`}
          </p>
        )}
      </section>

      {/* Filtros y Resultados */}
      <section className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filtros (Desktop) */}
          <div className="hidden lg:block w-64">
            <div className="glass rounded-lg p-4 border border-border space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </h3>

              {/* Precio */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rango de Precio
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, minPrice: Number(e.target.value) })
                    }
                    className="h-9 text-sm"
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, maxPrice: Number(e.target.value) })
                    }
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Stock */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) =>
                    setFilters({ ...filters, inStock: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm">Solo en Stock</span>
              </label>
            </div>
          </div>

          {/* Resultados */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ordenar:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="px-3 py-1 rounded border border-border bg-background text-sm"
                >
                  <option value="newest">Más Nuevos</option>
                  <option value="popular">Popular</option>
                  <option value="price-asc">Menor Precio</option>
                  <option value="price-desc">Mayor Precio</option>
                </select>
              </div>
            </div>

            {/* Mobile Filters */}
            {showFilters && (
              <div className="lg:hidden glass rounded-lg p-4 border border-border mb-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Rango de Precio
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) =>
                        setFilters({ ...filters, minPrice: Number(e.target.value) })
                      }
                      className="h-9 text-sm"
                    />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        setFilters({ ...filters, maxPrice: Number(e.target.value) })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.inStock}
                    onChange={(e) =>
                      setFilters({ ...filters, inStock: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Solo en Stock</span>
                </label>
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Cargando...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="glass rounded-lg border border-border p-12 text-center">
                <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Sin resultados</h2>
                <p className="text-muted-foreground mb-6">
                  No encontramos productos que coincidan con tu búsqueda
                </p>
                <Button asChild variant="outline">
                  <Link href="/categorias">Ver Todas las Categorías</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}