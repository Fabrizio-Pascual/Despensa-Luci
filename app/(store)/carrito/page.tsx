
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2, Package, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/components/cart-context'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

export default function CarritoPage() {
  const { items, total, updateQuantity, removeFromCart, addToCart, isLoading } = useCart()
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const supabase = useMemo(() => createClient(), [])
  // Qué botón puntual está en curso, para mostrarle el spinner solo a ese botón.
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [addingSuggestionId, setAddingSuggestionId] = useState<string | null>(null)

  const runPending = async (key: string, action: () => Promise<void>) => {
    if (pendingKey) return
    setPendingKey(key)
    try {
      await action()
    } finally {
      setPendingKey(null)
    }
  }

  // "Para completar tu mesa" — un par de productos activos que todavía no están en el carrito
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .gt('stock', 0)
        .limit(8)
      if (data) {
        const idsInCart = new Set(items.map(i => i.product_id))
        setSuggestions(data.filter((p: Product) => !idsInCart.has(p.id)).slice(0, 4))
      }
    }
    if (!isLoading) load()
  }, [supabase, isLoading, items])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="pb-16">
      <div className="mesh-bg" />
      <div className="container mx-auto px-4 max-w-3xl py-8 md:py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Seguir comprando</Link>
        </Button>

        <h1 className="text-display-lg text-foreground mb-2">Tu Pedido</h1>
        <p className="text-muted-foreground mb-8">Productos seleccionados con el cuidado de siempre.</p>

        {items.length === 0 ? (
          <div className="rounded-[24px] bg-card border border-border/40 py-16 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">Tu carrito está vacío</p>
            <p className="text-sm text-muted-foreground mb-6">Agregá productos para comenzar</p>
            <Button asChild className="rounded-xl"><Link href="/">Ver productos</Link></Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {items.map((item) => {
                const variantId = item.variant_id || null
                const keyBase = `${item.product_id}-${variantId ?? 'none'}`
                const removeKey = `${keyBase}-remove`
                const decKey = `${keyBase}-dec`
                const incKey = `${keyBase}-inc`
                const isRemoving = pendingKey === removeKey
                const isDecreasing = pendingKey === decKey
                const isIncreasing = pendingKey === incKey
                const rowBusy = pendingKey !== null && pendingKey.startsWith(keyBase)
                return (
                  <div key={item.id} className={`flex gap-4 p-4 rounded-[24px] bg-card border border-border/40 premium-transition ${rowBusy ? 'opacity-70' : ''}`}>
                    <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-muted shrink-0">
                      {item.product.image_url ? (
                        <Image src={item.product.image_url} alt={item.product.name} fill className="object-contain p-1" unoptimized />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-foreground leading-tight">
                          {item.product.name}
                          {item.variant_name && <span className="text-muted-foreground font-normal"> · {item.variant_name}</span>}
                        </h4>
                        <button
                          className="text-muted-foreground hover:text-destructive premium-transition shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                          disabled={pendingKey !== null}
                          onClick={() => runPending(removeKey, () => removeFromCart(item.product_id, variantId))}
                        >
                          {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.product.unit}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3 bg-secondary/60 rounded-full px-3 py-1.5">
                          <button
                            className="text-primary hover:text-primary/70 premium-transition active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
                            disabled={pendingKey !== null}
                            onClick={() => runPending(decKey, () => updateQuantity(item.product_id, item.quantity - 1, variantId))}
                          >
                            {isDecreasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Minus className="h-3.5 w-3.5" />}
                          </button>
                          <span className="text-sm font-semibold min-w-[1rem] text-center">{item.quantity}</span>
                          <button
                            className="text-primary hover:text-primary/70 premium-transition active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
                            onClick={() => runPending(incKey, () => updateQuantity(item.product_id, item.quantity + 1, variantId))}
                            disabled={pendingKey !== null || item.quantity >= item.product.stock}
                          >
                            {isIncreasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <p className="text-primary font-bold">{formatPrice(item.product.price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Para completar tu mesa */}
            {suggestions.length > 0 && (
              <div className="mt-8">
                <p className="text-label-bold uppercase tracking-widest text-muted-foreground mb-3">Para completar tu mesa</p>
                <div className="grid grid-cols-4 gap-3">
                  {suggestions.map((p) => {
                    const isAddingThis = addingSuggestionId === p.id
                    return (
                      <button
                        key={p.id}
                        disabled={addingSuggestionId !== null}
                        onClick={async () => {
                          setAddingSuggestionId(p.id)
                          try {
                            await addToCart(p.id, 1)
                          } finally {
                            setAddingSuggestionId(null)
                          }
                        }}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border/40 premium-transition hover:border-primary disabled:opacity-60"
                        title={`Agregar ${p.name}`}
                      >
                        {p.image_url ? (
                          <Image src={p.image_url} alt={p.name} fill className="object-contain p-2 group-hover:scale-110 premium-transition" unoptimized />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                        {isAddingThis && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Resumen */}
            <div className="glass rounded-[24px] p-6 mt-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-muted-foreground">Envío</span>
                <span className="text-primary font-medium">Bonificado</span>
              </div>
              <div className="h-px bg-border/60 mb-4" />
              <div className="flex justify-between items-center mb-6">
                <span className="text-headline-sm text-foreground">Total</span>
                <span className="text-headline-sm text-primary">{formatPrice(total)}</span>
              </div>
              <Button className="w-full rounded-xl group" size="lg" asChild>
                <Link href="/checkout" className="flex items-center justify-center gap-2">
                  Continuar al Pago
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
