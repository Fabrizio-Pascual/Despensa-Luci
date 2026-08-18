'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Minus, Plus, ShoppingCart, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/components/cart-context'
import { StockNotificationButton } from '@/components/stock-notification-button'
import { FavoriteButton } from '@/components/favorite-button'
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

/**
 * Imagen + panel de compra del detalle de producto, en un solo
 * componente cliente porque ambos necesitan saber qué sabor está
 * elegido: si el sabor tiene su propia foto, la imagen principal
 * cambia para mostrarla (mismo comportamiento que ya tenía la
 * tarjeta de producto del home, acá faltaba).
 *
 * El resto de la página (breadcrumbs, nombre, descripción,
 * relacionados) se queda como Server Component — no hacía falta
 * volver cliente toda la pantalla por esto.
 */
export function ProductBuyBox({ product, variants }: { product: Product; variants: Variant[] }) {
  const { addToCart } = useCart()
  const hasVariants = variants.length > 0
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(hasVariants ? variants[0] : null)
  const [qty, setQty] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  const effectivePrice = product.price + (selectedVariant?.price_modifier || 0)
  const effectiveStock = hasVariants ? (selectedVariant?.stock || 0) : product.stock
  const isOutOfStock = effectiveStock <= 0
  const displayImageUrl = (hasVariants && selectedVariant?.image_url) ? selectedVariant.image_url : product.image_url

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
    <>
      {/* Imagen principal — reacciona al sabor elegido */}
      <div className="relative aspect-square rounded-[24px] overflow-hidden bg-card border border-border/40">
        {displayImageUrl ? (
          <Image
            key={displayImageUrl}
            src={displayImageUrl}
            alt={hasVariants && selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name}
            fill
            className="object-contain p-8 premium-transition"
            sizes="(max-width: 768px) 90vw, 500px"
            priority
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-20 w-20 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Info + acciones */}
      <div>
        {product.category?.name && (
          <span className="inline-block bg-primary/10 text-primary text-label-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
            {product.category.name}
          </span>
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-display-lg text-foreground mb-3">{product.name}</h1>
          <FavoriteButton productId={product.id} className="shrink-0 mt-1" />
        </div>
        {product.description && (
          <p className="text-body-lg text-muted-foreground leading-relaxed mb-6">{product.description}</p>
        )}

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
    </>
  )
}
