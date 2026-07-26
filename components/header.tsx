'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { ShoppingCart, LogOut, LayoutDashboard, Store, ChevronDown, HelpCircle, Heart, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/components/auth-provider'
import { useCart } from '@/components/cart-context'
import { ProductSearch } from '@/components/product-search'
import type { Category } from '@/lib/types'

export function Header() {
  const { user, profile, loading: authLoading } = useAuth()
  const { itemCount } = useCart()
  const [mounted, setMounted] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    // Esperamos a que el AuthProvider termine de resolver la sesión antes
    // de pedir las categorías: si esta consulta sale mientras la sesión
    // todavía se está confirmando, corre el riesgo de pedirse una sola vez
    // con el estado equivocado y quedarse así (no hay reintento).
    if (authLoading) return
    const loadCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('display_order')
      setCategories(data || [])
    }
    loadCategories()
  }, [supabase, authLoading])

  const initials = (profile?.full_name || user?.email || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleSignOut = async () => {
    try {
      // Si signOut tarda más de 3s (problema de red), igual seguimos adelante
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ])
    } catch (error) {
      // Error silencioso: igual redirigimos al inicio
    } finally {
      window.location.href = '/'
    }
  }

  return (
    <header className="glass sticky top-0 z-50 w-full border-b-0">
      <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-headline-sm text-foreground">
          <Store className="h-8 w-8 text-primary" />
          <span className="font-display font-bold">Despensa Luci</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-primary font-bold border-b-2 border-primary pb-1 text-label-bold premium-transition">
            Inicio
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-muted-foreground hover:text-primary premium-transition text-label-bold outline-none">
              Categorías <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[70vh] overflow-y-auto w-56">
              {categories.map((cat) => (
                <DropdownMenuItem key={cat.id} asChild>
                  <Link href={`/categorias/${cat.slug}`} className="cursor-pointer">
                    {cat.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/como-comprar" className="flex items-center gap-1 text-muted-foreground hover:text-primary premium-transition text-label-bold">
            <HelpCircle className="h-4 w-4" /> Cómo comprar
          </Link>
          <Link href="/ofertas" className="flex items-center gap-1 text-muted-foreground hover:text-primary premium-transition text-label-bold">
            <Zap className="h-4 w-4" /> Ofertas
          </Link>
        </nav>

        {/* Actions (solo desktop: en mobile esto lo reemplaza la barra de abajo) */}
        <div className="hidden md:flex items-center gap-1">
          {/* Búsqueda de productos */}
          <ProductSearch />

          {/* Favoritos */}
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary/50" asChild>
            <Link href="/favoritos" title="Mis favoritos">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>

          {/* Carrito — página completa */}
          <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-secondary/50" asChild>
            <Link href="/carrito">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
          </Button>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'Avatar'} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-medium">
                  {profile?.full_name || user.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Mi cuenta
                  </Link>
                </DropdownMenuItem>
                {profile?.is_admin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Store className="mr-2 h-4 w-4" />
                      Panel Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : authLoading ? null : mounted ? (
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">Ingresar</Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link href="/auth/sign-up">Registrarse</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}