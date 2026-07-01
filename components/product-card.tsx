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

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, addToCart, updateQuantity, removeFromCart } = useCart()
  const [variants, setVariants] = useState<Variant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const loadVariants = async () => {
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
    loadVariants()
  }, [product.id, supabase])

  const hasVariants = variants.length > 0
  const activeVariant = selectedVariant
  const effectivePrice = product.price + (activeVariant?.price_modifier || 0)
  const effectiveStock = hasVariants ? (activeVariant?.stock || 0) : product.stock
  const effectiveImage = (hasVariants && activeVariant?.image_url) ? activeVariant.image_url : product.image_url

  // Para el carrito usamos el id del producto + variante como key única
  const cartKey = hasVariants && activeVariant ? `${product.id}-${activeVariant.id}` : product.id
  const cartItem = items.find(item => item.product_id === (hasVariants && activeVariant ? activeVariant.id : product.id))
  const quantity = cartItem?.quantity || 0
  const isOutOfStock = effectiveStock <= 0

  const handleAdd = () => {
    if (!isOutOfStock) {
      const targetId = hasVariants && activeVariant ? activeVariant.id : product.id
      addToCart(targetId, 1)
    }
  }

  const handleIncrement = () => {
    const targetId = hasVariants && activeVariant ? activeVariant.id : product.id
    if (quantity < effectiveStock) updateQuantity(targetId, quantity + 1)
  }

  const handleDecrement = () => {
    const targetId = hasVariants && activeVariant ? activeVariant.id : product.id
    if (quantity > 1) updateQuantity(targetId, quantity - 1)
    else removeFromCart(targetId)
  }

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md card-hover">
      <CardContent className="p-0">
        {/* Imagen */}
        <div className="relative aspect-square bg-muted">
          {effectiveImage ? (
            <Image
              src={effectiveImage}
              alt={activeVariant ? `${product.name} ${activeVariant.name}` : product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
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
          {effectiveStock > 0 && effectiveStock <= 5 && (
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

          {/* Selector de variantes */}
          {hasVariants && (
            <div className="flex flex-wrap gap-1">
              {variants.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`text-xs px-2 py-1 rounded-full border transition-all ${
                    selectedVariant?.id === variant.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:border-primary'
                  } ${variant.stock <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={variant.stock <= 0}
                  title={variant.stock <= 0 ? 'Sin stock' : variant.name}
                >
                  {variant.name}
                  {variant.price_modifier !== 0 && (
                    <span className="ml-1 opacity-70">
                      {variant.price_modifier > 0 ? '+' : ''}{formatPrice(variant.price_modifier)}
                    </span>
                  )}
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