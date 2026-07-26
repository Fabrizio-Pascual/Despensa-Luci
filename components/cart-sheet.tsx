'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/components/cart-context'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

export function CartSheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { items, itemCount, total, updateQuantity, removeFromCart, isLoading } = useCart()
  // Guardamos qué botón puntual está en curso (producto+variante+acción) para
  // mostrarle el spinner solo a ese botón, sin bloquear el resto del carrito.
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const runPending = async (key: string, action: () => Promise<void>) => {
    if (pendingKey) return
    setPendingKey(key)
    try {
      await action()
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Carrito ({itemCount})
          </SheetTitle>
          <SheetDescription className="sr-only">Revisá y modificá los productos en tu carrito</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
            <div>
              <p className="text-lg font-medium">Tu carrito está vacío</p>
              <p className="text-sm text-muted-foreground">Agregá productos para comenzar</p>
            </div>
            <Button onClick={() => setOpen(false)} asChild>
              <Link href="/">Ver productos</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 pb-4">
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
                    <div key={item.id} className={`flex gap-4 p-3 rounded-2xl bg-muted/40 border border-border/50 transition-all duration-300 hover:shadow-warm active:scale-[0.98] ${rowBusy ? 'opacity-70' : ''}`}>
                      <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        {item.product.image_url ? (
                          <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-medium text-sm truncate">
                            {item.product.name}
                            {item.variant_name && (
                              <span className="text-muted-foreground font-normal"> · {item.variant_name}</span>
                            )}
                          </h4>
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                            disabled={pendingKey !== null}
                            onClick={() => runPending(removeKey, () => removeFromCart(item.product_id, variantId))}
                          >
                            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground">{formatPrice(item.product.price)} / {item.product.unit}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3 bg-muted rounded-full px-3 py-1">
                            <button className="text-primary hover:text-primary/70 transition-colors active:scale-90 duration-150 disabled:opacity-40 disabled:pointer-events-none"
                              disabled={pendingKey !== null}
                              onClick={() => runPending(decKey, () => updateQuantity(item.product_id, item.quantity - 1, variantId))}>
                              {isDecreasing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Minus className="h-3 w-3" />}
                            </button>
                            <span className="text-sm font-semibold min-w-[1rem] text-center">{item.quantity}</span>
                            <button className="text-primary hover:text-primary/70 transition-colors active:scale-90 duration-150 disabled:opacity-40 disabled:pointer-events-none"
                              onClick={() => runPending(incKey, () => updateQuantity(item.product_id, item.quantity + 1, variantId))}
                              disabled={pendingKey !== null || item.quantity >= item.product.stock}>
                              {isIncreasing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            </button>
                          </div>
                          <p className="font-semibold text-sm text-primary">{formatPrice(item.product.price * item.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <Separator />

            <SheetFooter className="flex-col gap-4 sm:flex-col glass -mx-6 px-6 pt-4 rounded-t-2xl">
              <div className="flex justify-between items-center w-full">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
              </div>
              <Button className="w-full group" size="lg" asChild onClick={() => setOpen(false)}>
                <Link href="/checkout" className="flex items-center justify-center gap-2">
                  Finalizar pedido
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}