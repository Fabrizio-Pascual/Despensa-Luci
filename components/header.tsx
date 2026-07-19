'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { ShoppingCart, User, Menu, X, LogOut, LayoutDashboard, Store, Sun, Moon, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import { useCart } from '@/components/cart-context'
import { CartSheet } from '@/components/cart-sheet'
import { ProductSearch } from '@/components/product-search'
import type { Category } from '@/lib/types'

export function Header() {
  const { user, profile, loading: authLoading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { itemCount } = useCart()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*').order('display_order')
      if (error) console.error('[header] error cargando categorias:', error.message, error.code, error.details)
      setCategories(data || [])
    }
    loadCategories()
  }, [supabase])

  const handleSignOut = async () => {
    try {
      // Si signOut tarda más de 3s (problema de red), igual seguimos adelante
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ])
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      window.location.href = '/'
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Store className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-foreground">Despensa Luci</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Inicio
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors outline-none">
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
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Búsqueda de productos */}
          <ProductSearch />

          {/* Theme toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}

          {/* Cart */}
          <CartSheet>
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Button>
          </CartSheet>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
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
              <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                <Link href="/auth/login">Ingresar</Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link href="/auth/sign-up">Registrarse</Link>
              </Button>
            </div>
          ) : null}

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0 flex flex-col h-full">
              <SheetHeader className="sr-only">
                <SheetTitle>Menú de navegación</SheetTitle>
                <SheetDescription>Navegación principal de Despensa Luci</SheetDescription>
              </SheetHeader>
              {/* Header del menu */}
              <div className="p-6 border-b bg-primary/5 shrink-0">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">Despensa Luci</span>
                </div>
                <p className="text-xs text-muted-foreground">Tu despensa de barrio</p>
              </div>
              {/* Nav links */}
              <nav className="p-4 space-y-1 overflow-y-auto flex-1 min-h-0">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-primary/8 hover:text-primary transition-colors font-medium"
                >
                  <span className="text-xl">🏠</span>
                  Inicio
                </Link>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categorías</p>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categorias/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-foreground hover:bg-primary/8 hover:text-primary transition-colors text-sm"
                  >
                    <span className="text-lg">📦</span>
                    {cat.name}
                  </Link>
                ))}
              </nav>
              {/* Footer del menu */}
              {!user && !authLoading && (
                <div className="shrink-0 p-4 border-t space-y-2 bg-card">
                  <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Ingresar</Button>
                  </Link>
                  <Link href="/auth/sign-up" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Registrarse</Button>
                  </Link>
                </div>
              )}
              {user && (
                <div className="shrink-0 p-4 border-t bg-card">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 mb-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{profile?.full_name || user.email}</p>
                      <p className="text-xs text-muted-foreground">Mi cuenta</p>
                    </div>
                  </div>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full mb-2">Mis pedidos</Button>
                  </Link>
                  <Button variant="ghost" className="w-full text-destructive" onClick={handleSignOut}>
                    Cerrar sesión
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}