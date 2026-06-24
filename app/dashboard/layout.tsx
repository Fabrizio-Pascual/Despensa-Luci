import { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Package, User, FileText, Store } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CartProvider } from '@/components/cart-context'
import { Header } from '@/components/header'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Mis Pedidos', icon: Package },
    { href: '/dashboard/perfil', label: 'Mi Perfil', icon: User },
    { href: '/dashboard/deudas', label: 'Mis Deudas', icon: FileText },
  ]

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <aside className="md:w-64 flex-shrink-0">
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Store className="h-5 w-5" />
                  Volver a la tienda
                </Link>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
    </CartProvider>
  )
}
