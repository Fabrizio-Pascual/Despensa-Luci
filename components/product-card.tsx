'use client'

import Image from 'next/image'
import { Minus, Plus, ShoppingCart, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/components/cart-context'
import type { Product } from '@/lib/types'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(price)
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, addToCart, updateQuantity, removeFromCart } = useCart()
  
  const cartItem = items.find(item => item.product_id === product.id)
  const quantity = cartItem?.quantity || 0
  const isOutOfStock = product.stock <= 0

  const handleAdd = () => {
    if (!isOutOfStock) {
      addToCart(product.id, 1)
    }
  }

  const handleIncrement = () => {
    if (quantity < product.stock) {
      updateQuantity(product.id, quantity + 1)
    }
  }

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1)
    } else {
      removeFromCart(product.id)
    }
  }

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative aspect-square bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="destructive" className="text-sm">Sin stock</Badge>
            </div>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground">
              Quedan {product.stock}
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-medium line-clamp-2 leading-tight">{product.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {formatPrice(product.price)} / {product.unit}
            </p>
          </div>

          {/* Add to cart */}
          {quantity === 0 ? (
            <Button
              className="w-full"
              onClick={handleAdd}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecrement}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-lg min-w-[2rem] text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                disabled={quantity >= product.stock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
