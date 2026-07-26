'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, LayoutGrid, ShoppingCart, User, Home, MoreVertical, HelpCircle, LayoutDashboard, Heart, Zap } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useCart } from '@/components/cart-context'
import { ProductSearch } from '@/components/product-search'

/**
 * Barra de navegación fija abajo de la pantalla, solo para celulares
 * (`md:hidden`). Reemplaza al navbar de arriba como forma principal de
 * moverse por el sitio en mobile: buscar, categorías, home, carrito,
 * mi cuenta y más opciones (cómo usar, panel admin).
 */
export function MobileBottomNav() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const { itemCount } = useCart()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  const isAdmin = profile?.is_admin || false

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const itemClass = (active: boolean) =>
    `flex flex-1 h-full flex-col items-center justify-center gap-0.5 premium-transition ${
      active ? 'text-primary' : 'text-muted-foreground'
    }`

  const labelClass = 'text-[10px] font-medium leading-none'

  const handleMoreMenuClick = (href: string) => {
    setMoreMenuOpen(false)
  }

  return (
    <nav
      className="glass fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-x-0 border-b-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex w-full h-14">
        {/* Home */}
        <Link href="/" className={itemClass(isActive('/'))}>
          <Home className="h-5 w-5" />
          <span className={labelClass}>Home</span>
        </Link>

        {/* Buscar */}
        <ProductSearch
          renderTrigger={(onOpen) => (
            <button type="button" onClick={onOpen} className={itemClass(false)}>
              <Search className="h-5 w-5" />
              <span className={labelClass}>Buscar</span>
            </button>
          )}
        />

        {/* Categorías */}
        <Link href="/categorias" className={itemClass(isActive('/categorias'))}>
          <LayoutGrid className="h-5 w-5" />
          <span className={labelClass}>Categorías</span>
        </Link>

        {/* Carrito */}
        <Link href="/carrito" className={`relative ${itemClass(isActive('/carrito'))}`}>
          <span className="relative">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </span>
          <span className={labelClass}>Carrito</span>
        </Link>

        {/* Mi cuenta */}
        <Link href={user ? '/dashboard' : '/auth/login'} className={itemClass(isActive('/dashboard') || isActive('/auth'))}>
          <User className="h-5 w-5" />
          <span className={labelClass}>Mi cuenta</span>
        </Link>

        {/* Más opciones */}
        <div className="flex flex-1 h-full relative">
          <button
            type="button"
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={itemClass(false)}
          >
            <MoreVertical className="h-5 w-5" />
            <span className={labelClass}>Más</span>
          </button>

          {/* Dropdown menu */}
          {moreMenuOpen && (
            <div className="absolute bottom-14 right-0 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-48">
              <Link
                href="/favoritos"
                className="flex items-center gap-2 px-4 py-3 hover:bg-muted premium-transition text-sm w-full"
                onClick={() => handleMoreMenuClick('/favoritos')}
              >
                <Heart className="h-4 w-4" />
                <span>Favoritos</span>
              </Link>

              <div className="border-t border-border" />
              <Link
                href="/ofertas"
                className="flex items-center gap-2 px-4 py-3 hover:bg-muted premium-transition text-sm w-full"
                onClick={() => handleMoreMenuClick('/ofertas')}
              >
                <Zap className="h-4 w-4" />
                <span>Ofertas</span>
              </Link>

              <div className="border-t border-border" />
              <Link
                href="/como-comprar"
                className="flex items-center gap-2 px-4 py-3 hover:bg-muted premium-transition text-sm w-full"
                onClick={() => handleMoreMenuClick('/como-comprar')}
              >
                <HelpCircle className="h-4 w-4" />
                <span>Cómo usar</span>
              </Link>

              {isAdmin && (
                <>
                  <div className="border-t border-border" />
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-3 hover:bg-muted premium-transition text-sm w-full text-primary font-medium"
                    onClick={() => handleMoreMenuClick('/admin')}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Panel Admin</span>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cerrar menú al hacer click fuera */}
      {moreMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMoreMenuOpen(false)}
        />
      )}
    </nav>
  )
}