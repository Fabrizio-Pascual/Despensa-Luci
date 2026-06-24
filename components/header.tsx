'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ShoppingCart, User, Menu, LogOut, LayoutDashboard, Store, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/cart-context'
import type { Profile } from '@/lib/types'

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

export function Header() {
  console.log('HEADER RENDERIZANDO')
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { items, itemCount, total, updateQuantity, removeFromCart, isLoading } = useCart()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    }
    getUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setProfile(data)
      } else {
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Store className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Despensa Luci</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Inicio</Link>
            <Link href="/categorias" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Categorias</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  {itemCount}
                </span>
              )}
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium">{profile?.full_name || user.email}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/dashboard" className="cursor-pointer"><LayoutDashboard className="mr-2 h-4 w-4" />Mi cuenta</Link></DropdownMenuItem>
                  {profile?.is_admin && (
                    <DropdownMenuItem asChild><Link href="/admin" className="cursor-pointer"><Store className="mr-2 h-4 w-4" />Panel Admin</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive"><LogOut className="mr-2 h-4 w-4" />Cerrar sesion</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="default" size="sm"><Link href="/auth/login">Ingresar</Link></Button>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="flex flex-col w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" />Carrito ({itemCount})</SheetTitle>
            <SheetDescription className="sr-only">Tu carrito de compras</SheetDescription>
          </SheetHeader>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
              <div><p className="text-lg font-medium">Tu carrito está vacío</p><p className="text-sm text-muted-foreground">Agregá productos para comenzar</p></div>
              <Button onClick={() => setCartOpen(false)} asChild><Link href="/">Ver productos</Link></Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 pb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.product.image_url ? (
                          <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center"><ShoppingBag className="h-8 w-8 text-muted-foreground/50" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                        <p className="text-sm text-muted-foreground">{formatPrice(item.product.price)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-destructive" onClick={() => removeFromCart(item.product_id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <p className="font-medium text-sm">{formatPrice(item.product.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Separator />
              <SheetFooter className="flex-col gap-4 sm:flex-col">
                <div className="flex justify-between items-center w-full">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
                </div>
                <Button className="w-full" size="lg" asChild onClick={() => setCartOpen(false)}>
                  <Link href="/checkout">Finalizar pedido</Link>
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px]">
          <SheetHeader><SheetTitle>Menú</SheetTitle><SheetDescription className="sr-only">Navegación</SheetDescription></SheetHeader>
          <nav className="flex flex-col gap-4 mt-6">
            <Link href="/" className="text-lg font-medium" onClick={() => setMobileOpen(false)}>Inicio</Link>
            <Link href="/categorias" className="text-lg font-medium" onClick={() => setMobileOpen(false)}>Categorias</Link>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}

