import { Store } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <span className="font-semibold">Despensa Luci</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Tu despensa de barrio de confianza. Hace tu pedido y retiralo en el local.
          </p>
          <p className="text-sm text-muted-foreground">
            {new Date().getFullYear()} Despensa Luci
          </p>
        </div>
      </div>
    </footer>
  )
}
