'use client'

import Link from 'next/link'
import { Store, Mail, Send } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/40 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">

          {/* Logo y descripción */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Store className="h-6 w-6 text-primary" />
              <span className="text-headline-sm text-foreground">Despensa Luci</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium Neighborhood Goods. Llevamos la frescura del campo a la puerta de tu casa con un toque de sofisticación.
            </p>
          </div>

          {/* Comprar */}
          <div>
            <p className="text-headline-sm text-foreground mb-4">Comprar</p>
            <div className="space-y-2.5">
              <Link href="/categorias" className="block text-sm text-muted-foreground hover:text-primary premium-transition">Todos los productos</Link>
              <Link href="/categorias" className="block text-sm text-muted-foreground hover:text-primary premium-transition">Ofertas de la semana</Link>
              <Link href="/dashboard" className="block text-sm text-muted-foreground hover:text-primary premium-transition">Mis pedidos</Link>
              <Link href="/como-comprar" className="block text-sm text-muted-foreground hover:text-primary premium-transition">Cómo comprar</Link>
            </div>
          </div>

          {/* Institucional */}
          <div>
            <p className="text-headline-sm text-foreground mb-4">Institucional</p>
            <div className="space-y-2.5">
              <a
                href="https://www.google.com/maps/search/?api=1&query=-31.434700519515722,-64.4549122429774"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-muted-foreground hover:text-primary premium-transition"
              >
                Ubicación del local
              </a>
              <p className="text-sm text-muted-foreground">Horarios: todos los días</p>
              <a
                href="mailto:fpascual624@gmail.com?subject=Ayuda%20-%20Despensa%20Luci&body=Hola%2C%20necesito%20ayuda%20con..."
                className="block text-sm text-muted-foreground hover:text-primary premium-transition"
              >
                Contactar soporte
              </a>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <p className="text-headline-sm text-foreground mb-4">Newsletters</p>
            <p className="text-sm text-muted-foreground mb-4">Recibí las mejores ofertas directo en tu mail.</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Email"
                required
                className="flex-1 min-w-0 bg-background border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                aria-label="Suscribirme"
                className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 active:scale-95 premium-transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

        </div>

        <div className="border-t border-border/40 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Despensa Luci. Premium Neighborhood Goods.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <a href="mailto:fpascual624@gmail.com" className="hover:text-primary premium-transition">
              fpascual624@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
