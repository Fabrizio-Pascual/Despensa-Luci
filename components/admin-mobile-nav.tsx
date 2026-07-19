'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Home, ShoppingCart, Package, Tag, BarChart3, FileText, Users, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

const navItems = [
  { href: '/admin', label: 'Pedidos', icon: ShoppingCart },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/categorias', label: 'Categorías', icon: Tag },
  { href: '/admin/ventas', label: 'Ventas', icon: BarChart3 },
  { href: '/admin/deudas', label: 'Deudas', icon: FileText },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/reseñas', label: 'Reseñas', icon: Star },
]

export function AdminMobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="text-sidebar-foreground">
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetHeader className="p-4 border-b border-sidebar-border">
            <SheetTitle className="text-sidebar-foreground text-left">Menú Admin</SheetTitle>
            <SheetDescription className="sr-only">Navegación del panel de administración</SheetDescription>
          </SheetHeader>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-sidebar-border">
            <Link href="/" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <Home className="h-5 w-5" />
              Ver tienda
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}