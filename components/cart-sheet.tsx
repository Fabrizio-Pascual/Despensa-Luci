'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
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
                  return (
                    <div key={item.id} className="flex gap-4">
                      <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.product.image_url ? (
                          <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {item.product.name}
                          {item.variant_name && (
                            <span className="text-muted-foreground font-normal"> · {item.variant_name}</span>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">{formatPrice(item.product.price)} / {item.product.unit}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="outline" size="icon" className="h-7 w-7"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1, variantId)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1, variantId)}
                            disabled={item.quantity >= item.product.stock}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-destructive hover:text-destructive"
                            onClick={() => removeFromCart(item.product_id, variantId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatPrice(item.product.price * item.quantity)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <Separator />

            <SheetFooter className="flex-col gap-4 sm:flex-col">
              <div className="flex justify-between items-center w-full">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
              </div>
              <Button className="w-full" size="lg" asChild onClick={() => setOpen(false)}>
                <Link href="/checkout">Finalizar pedido</Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}