'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Minus, Plus, ShoppingCart, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/components/cart-context'
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

  const handleAdd = () => {
    if (isOutOfStock) return
    if (hasVariants && !selectedVariant) return
    addToCart(product.id, 1, variantId, selectedVariant?.name || null)
  }

  const handleIncrement = () => {
    if (quantity < effectiveStock) {
      updateQuantity(product.id, quantity + 1, variantId)
    }
  }

  const handleDecrement = () => {
    if (quantity > 1) updateQuantity(product.id, quantity - 1, variantId)
    else removeFromCart(product.id, variantId)
  }

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md card-hover">
      <CardContent className="p-0">
        {/* Imagen */}
        <div className="relative aspect-square bg-muted p-3">
          {effectiveImage ? (
            <Image
              src={effectiveImage}
              alt={product.name}
              fill
              className="object-contain p-2 transition-transform group-hover:scale-105"
              unoptimized
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
            <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground">
              Quedan {effectiveStock}
            </Badge>
          )}
        </div>

        <div className="p-3 space-y-2">
          <div>
            <h3 className="font-medium line-clamp-2 leading-tight text-sm">{product.name}</h3>
            <p className="text-sm text-primary font-semibold mt-0.5">
              {formatPrice(effectivePrice)} / {product.unit}
            </p>
          </div>

          {/* Selector de sabores/variantes */}
          {hasVariants && (
            <div className="flex flex-wrap gap-1">
              {variants.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  disabled={variant.stock <= 0}
                  className={`text-xs px-2 py-1 rounded-full border transition-all ${
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

          {/* Botón agregar */}
          {quantity === 0 ? (
            <Button className="w-full" size="sm" onClick={handleAdd} disabled={isOutOfStock}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleDecrement}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-semibold text-base min-w-[2rem] text-center">{quantity}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleIncrement} disabled={quantity >= effectiveStock}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}