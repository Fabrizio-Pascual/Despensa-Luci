'use client'

import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Package, Plus, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/cart-context'
import type { Product, Category } from '@/lib/types'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

type SearchResult = Product & { category: Category | null }

export function ProductSearch({ renderTrigger }: { renderTrigger?: (onOpen: () => void) => ReactNode } = {}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const { addToCart } = useCart()

  const RECENT_KEY = 'recent_searches'
  const MAX_RECENT = 6

  const loadRecentSearches = () => {
    try {
      const stored = localStorage.getItem(RECENT_KEY)
      setRecentSearches(stored ? JSON.parse(stored) : [])
    } catch {
      setRecentSearches([])
    }
  }

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    try {
      const stored = localStorage.getItem(RECENT_KEY)
      const current: string[] = stored ? JSON.parse(stored) : []
      const updated = [trimmed, ...current.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT)
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
      setRecentSearches(updated)
    } catch {
      // Si localStorage falla (modo privado, etc.) simplemente no guardamos historial
    }
  }

  const removeRecentSearch = (term: string) => {
    try {
      const updated = recentSearches.filter((t) => t !== term)
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
      setRecentSearches(updated)
    } catch {
      // no-op
    }
  }

  // Atajo de teclado: Ctrl/Cmd + K abre el buscador
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setAddedIds(new Set())
    } else {
      loadRecentSearches()
    }
  }, [open])

  const runSearch = useCallback(async (term: string) => {
    if (!term.trim()) { setResults([]); return }
    setIsLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .ilike('name', `%${term.trim()}%`)
      .order('name')
      .limit(20)
    setResults((data as SearchResult[]) || [])
    setIsLoading(false)
    saveRecentSearch(term)
  }, [supabase])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), 300)
  }

  const handleAdd = async (productId: string) => {
    await addToCart(productId, 1)
    setAddedIds((prev) => new Set(prev).add(productId))
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }, 1500)
  }

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => setOpen(true))
      ) : (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Buscar productos (Ctrl+K)">
          <Search className="h-5 w-5" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Buscar productos</DialogTitle>
            <DialogDescription>Escribí el nombre del producto que buscás</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Buscá un producto por su nombre..."
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />}
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {!query.trim() ? (
              <div className="py-6 px-4 text-sm text-muted-foreground">
                {recentSearches.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 mb-2">Búsquedas recientes</p>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleChange(term)}
                          className="group flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary hover:text-primary premium-transition"
                        >
                          {term}
                          <X
                            className="h-3 w-3 opacity-0 group-hover:opacity-100 premium-transition"
                            onClick={(e) => { e.stopPropagation(); removeRecentSearch(term) }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-6">Empezá a escribir para buscar entre todos nuestros productos</p>
                )}
                <Link
                  href="/buscar"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1 text-primary text-xs font-semibold mt-2 hover:underline"
                >
                  Búsqueda avanzada con filtros →
                </Link>
              </div>
            ) : !isLoading && results.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground px-4">
                No encontramos productos que coincidan con &quot;{query}&quot;
              </div>
            ) : (
              <ul className="divide-y">
                {results.map((product) => (
                  <li key={product.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <Link
                      href={`/categorias/${product.category?.slug || ''}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} width={44} height={44} className="object-cover h-full w-full" unoptimized />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{product.category?.name}</p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
                      <Button
                        size="icon"
                        variant={addedIds.has(product.id) ? 'default' : 'outline'}
                        className="h-8 w-8"
                        disabled={product.stock <= 0}
                        onClick={() => handleAdd(product.id)}
                        title={product.stock <= 0 ? 'Sin stock' : 'Agregar al carrito'}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {query.trim() && (
              <Link
                href={`/buscar?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 text-primary text-xs font-semibold py-3 border-t hover:underline"
              >
                Ver más resultados y filtros avanzados →
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}