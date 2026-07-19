import { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Package, ShoppingCart, BarChart3, FileText, Store, Users, Tag, Home, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AdminMobileNav } from '@/components/admin-mobile-nav'
import { AdminNotifications } from '@/components/admin-notifications'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const navItems = [
    { href: '/admin', label: 'Pedidos', icon: ShoppingCart },
    { href: '/admin/productos', label: 'Productos', icon: Package },
    { href: '/admin/categorias', label: 'Categorías', icon: Tag },
    { href: '/admin/ventas', label: 'Ventas', icon: BarChart3 },
    { href: '/admin/deudas', label: 'Deudas', icon: FileText },
    { href: '/admin/clientes', label: 'Clientes', icon: Users },
    { href: '/admin/reseñas', label: 'Reseñas', icon: Star },
  ]

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-col shrink-0">
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <Store className="h-6 w-6 text-sidebar-primary" />
            <span className="font-bold text-sidebar-foreground">Admin Panel</span>
          </Link>
          <AdminNotifications />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <Link href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <Home className="h-5 w-5" />
            Ver tienda
          </Link>
        </div>
      </aside>

      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-2">
          <Store className="h-6 w-6 text-sidebar-primary" />
          <span className="font-bold text-sidebar-foreground">Admin Panel</span>
        </Link>
        <div className="flex items-center gap-1">
          <AdminNotifications />
          <AdminMobileNav />
        </div>
      </div>

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}