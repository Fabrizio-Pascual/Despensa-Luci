import Link from 'next/link'
import { Store, Mail, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Logo y descripción */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Store className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Despensa Luci</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tu despensa de barrio de confianza. Hacé tu pedido y retiralo en el local.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Navegación</p>
            <div className="space-y-2">
              <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Inicio</Link>
              <Link href="/categorias" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Categorías</Link>
              <Link href="/dashboard" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Mis pedidos</Link>
            </div>
          </div>

          {/* Ayuda y contacto */}
          <div>
            <p className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">¿Necesitás ayuda?</p>
            <p className="text-sm text-muted-foreground mb-4">
              Si tenés algún problema con tu pedido o la app, escribinos y te respondemos a la brevedad.
            </p>
            <Button asChild variant="outline" className="rounded-full gap-2 w-full sm:w-auto">
              <a href="mailto:fpascual624@gmail.com?subject=Ayuda%20-%20Despensa%20Luci&body=Hola%2C%20necesito%20ayuda%20con...">
                <HelpCircle className="h-4 w-4 text-primary" />
                Contactar soporte
              </a>
            </Button>
          </div>

        </div>

        <div className="border-t mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Despensa Luci — Villa San Nicolás, Malagueño, Córdoba
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <a href="mailto:fpascual624@gmail.com" className="hover:text-foreground transition-colors">
              fpascual624@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}