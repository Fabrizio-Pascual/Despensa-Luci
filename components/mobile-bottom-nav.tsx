'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, LayoutGrid, HelpCircle, ShoppingCart, User } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useCart } from '@/components/cart-context'
import { ProductSearch } from '@/components/product-search'

/**
 * Barra de navegación fija abajo de la pantalla, solo para celulares
 * (`md:hidden`). Reemplaza al navbar de arriba como forma principal de
 * moverse por el sitio en mobile: buscar, mi cuenta, categorías,
 * cómo comprar y el carrito.
 */
export function MobileBottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { itemCount } = useCart()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const itemClass = (active: boolean) =>
    `flex flex-1 h-full flex-col items-center justify-center gap-0.5 premium-transition ${
      active ? 'text-primary' : 'text-muted-foreground'
    }`

  const labelClass = 'text-[10px] font-medium leading-none'

  return (
    <nav
      className="glass fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-x-0 border-b-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex w-full h-14">
        <ProductSearch
          renderTrigger={(onOpen) => (
            <button type="button" onClick={onOpen} className={itemClass(false)}>
              <Search className="h-5 w-5" />
              <span className={labelClass}>Buscar</span>
            </button>
          )}
        />

        <Link href="/categorias" className={itemClass(isActive('/categorias'))}>
          <LayoutGrid className="h-5 w-5" />
          <span className={labelClass}>Categorías</span>
        </Link>

        <Link href="/como-comprar" className={itemClass(isActive('/como-comprar'))}>
          <HelpCircle className="h-5 w-5" />
          <span className={labelClass}>Cómo usar</span>
        </Link>

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

        <Link href={user ? '/dashboard' : '/auth/login'} className={itemClass(isActive('/dashboard') || isActive('/auth'))}>
          <User className="h-5 w-5" />
          <span className={labelClass}>Mi cuenta</span>
        </Link>
      </div>
    </nav>
  )
}