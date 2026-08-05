'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Minus, Plus, ShoppingCart, Package, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/components/cart-context'
import { FavoriteButton } from '@/components/favorite-button'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

interface Variant {
  id: string
  name: string
  image_url: string | null
  stock: number
  price_modifier: number
  is_active: boolean
  display_order: number
}

export function ProductCard({ product }: { product: Product }) {
  const { items, addToCart, updateQuantity, removeFromCart } = useCart()
  const [variants, setVariants] = useState<Variant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [justAdded, setJustAdded] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  // Cargar variantes del producto
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('display_order')
      if (data && data.length > 0) {
        setVariants(data)
        setSelectedVariant(data[0])
      }
    }
    load()
  }, [product.id, supabase])

  const hasVariants = variants.length > 0
  const effectivePrice = product.price + (selectedVariant?.price_modifier || 0)
  const effectiveStock = hasVariants ? (selectedVariant?.stock || 0) : product.stock
  const effectiveImage = (hasVariants && selectedVariant?.image_url) ? selectedVariant.image_url : product.image_url
  const isOutOfStock = effectiveStock <= 0

  // Buscar el item de carrito correspondiente a este producto + variante seleccionada
  const variantId = hasVariants && selectedVariant ? selectedVariant.id : null
  const cartItem = items.find(item =>
    item.product_id === product.id &&
    (item.variant_id || null) === variantId
  )
  const quantity = cartItem?.quantity || 0

  const handleAdd = async () => {
    if (isOutOfStock || isAdding) return
    if (hasVariants && !selectedVariant) return
    setIsAdding(true)
    try {
      await addToCart(product.id, 1, variantId, selectedVariant?.name || null)
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 400)
    } finally {
      setIsAdding(false)
    }
  }

  const handleIncrement = async () => {
    if (isUpdating || quantity >= effectiveStock) return
    setIsUpdating(true)
    try {
      await updateQuantity(product.id, quantity + 1, variantId)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDecrement = async () => {
    if (isUpdating) return
    setIsUpdating(true)
    try {
      if (quantity > 1) await updateQuantity(product.id, quantity - 1, variantId)
      else await removeFromCart(product.id, variantId)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="relative bg-card border border-border/40 rounded-[24px] p-4 group premium-transition card-hover">
      {/* Imagen */}
      <Link href={`/producto/${product.id}`} className="relative h-48 rounded-2xl overflow-hidden mb-4 bg-muted block">
        {effectiveImage ? (
          <Image
            src={effectiveImage}
            alt={product.name}
            fill
            className="object-contain p-4 premium-transition group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, 300px"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive">Sin stock</Badge>
          </div>
        )}
        {!isOutOfStock && effectiveStock <= 5 && (
          <span className="absolute top-2 right-2 bg-warning text-warning-foreground text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-tighter">
            Quedan {effectiveStock}
          </span>
        )}
      </Link>

      {/* Favorito — flotante sobre la imagen, arriba a la izquierda */}
      <div className="absolute top-3 left-3 z-10">
        <FavoriteButton productId={product.id} className="!bg-background/70 backdrop-blur-sm" />
      </div>


      <div className="px-1 space-y-3">
        <div>
          {product.category?.name && (
            <span className="text-muted-foreground text-xs text-label-bold uppercase">{product.category.name}</span>
          )}
          <Link href={`/producto/${product.id}`}>
            <h4 className="text-body-md font-bold text-foreground mt-1 line-clamp-2 leading-tight hover:text-primary premium-transition">{product.name}</h4>
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">/ {product.unit}</p>
        </div>

        {/* Selector de sabores/variantes */}
        {hasVariants && (
          <div className="flex flex-wrap gap-1">
            {variants.map(variant => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant)}
                disabled={variant.stock <= 0}
                className={`text-xs px-2 py-1 rounded-full border premium-transition ${
                  selectedVariant?.id === variant.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-primary'
                } ${variant.stock <= 0 ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
              >
                {variant.name}
              </button>
            ))}
          </div>
        )}

        {/* Precio + acción */}
        {quantity === 0 ? (
          <div className="flex justify-between items-center pt-2">
            <span className={`text-primary text-headline-sm ${justAdded ? 'cart-bump' : ''}`}>{formatPrice(effectivePrice)}</span>
            <button
              onClick={handleAdd}
              disabled={isOutOfStock || isAdding}
              className="w-10 h-10 bg-secondary/60 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground hover:scale-110 active:scale-90 premium-transition disabled:opacity-40 disabled:pointer-events-none"
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={handleDecrement} disabled={isUpdating} loading={isUpdating}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="font-semibold text-base min-w-[2rem] text-center">{quantity}</span>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={handleIncrement} disabled={isUpdating || quantity >= effectiveStock} loading={isUpdating}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}