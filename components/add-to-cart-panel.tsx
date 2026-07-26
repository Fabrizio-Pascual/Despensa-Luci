'use client'

import { useState } from 'react'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/components/cart-context'
import { StockNotificationButton } from '@/components/stock-notification-button'
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

export function AddToCartPanel({ product, variants }: { product: Product; variants: Variant[] }) {
  const { addToCart } = useCart()
  const hasVariants = variants.length > 0
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(hasVariants ? variants[0] : null)
  const [qty, setQty] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  const effectivePrice = product.price + (selectedVariant?.price_modifier || 0)
  const effectiveStock = hasVariants ? (selectedVariant?.stock || 0) : product.stock
  const isOutOfStock = effectiveStock <= 0

  const handleAdd = async () => {
    if (isOutOfStock || isAdding) return
    setIsAdding(true)
    try {
      await addToCart(product.id, qty, hasVariants ? selectedVariant?.id || null : null, selectedVariant?.name || null)
      setQty(1)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-5">
        <span className="text-primary text-display-lg">{formatPrice(effectivePrice)}</span>
        <span className="text-muted-foreground">{product.unit}</span>
      </div>

      {hasVariants && (
        <div className="flex flex-wrap gap-2 mb-6">
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => setSelectedVariant(variant)}
              disabled={variant.stock <= 0}
              className={`text-sm px-4 py-2 rounded-full border premium-transition ${
                selectedVariant?.id === variant.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border/60 hover:border-primary'
              } ${variant.stock <= 0 ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
            >
              {variant.name}
            </button>
          ))}
        </div>
      )}

      {isOutOfStock ? (
        <p className="text-destructive font-medium mb-4">Sin stock por el momento</p>
      ) : effectiveStock <= 5 ? (
        <p className="text-warning text-sm mb-4">Quedan {effectiveStock} unidades</p>
      ) : null}

      {isOutOfStock ? (
        <StockNotificationButton productId={product.id} productName={product.name} />
      ) : (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 bg-card border border-border/60 rounded-xl px-3 py-2.5">
          <button className="text-foreground hover:text-primary premium-transition disabled:opacity-30" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>
            <Minus className="h-4 w-4" />
          </button>
          <span className="font-semibold min-w-[1.5rem] text-center">{qty}</span>
          <button className="text-foreground hover:text-primary premium-transition disabled:opacity-30" onClick={() => setQty(q => Math.min(effectiveStock, q + 1))} disabled={qty >= effectiveStock}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Button size="lg" className="flex-1 rounded-xl gap-2 text-label-bold" onClick={handleAdd} disabled={isOutOfStock} loading={isAdding}>
          <ShoppingCart className="h-4 w-4" />
          Agregar al carrito
        </Button>
      </div>
      )}
    </div>
  )
}