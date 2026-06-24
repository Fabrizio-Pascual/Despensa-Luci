import Link from 'next/link'
import { Clock, CheckCircle, Package, XCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

const statusConfig = {
  pending: { label: 'Pendiente', icon: Clock, variant: 'secondary' as const },
  preparing: { label: 'Preparando', icon: Package, variant: 'default' as const },
  ready: { label: 'Listo para retirar', icon: AlertCircle, variant: 'default' as const },
  completed: { label: 'Completado', icon: CheckCircle, variant: 'outline' as const },
  cancelled: { label: 'Cancelado', icon: XCircle, variant: 'destructive' as const },
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(price)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(name))')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Pedidos</h1>
        <p className="text-muted-foreground">Historial y seguimiento de tus pedidos</p>
      </div>

      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status as keyof typeof statusConfig]
            const StatusIcon = status.icon

            return (
              <Link key={order.id} href={`/dashboard/pedidos/${order.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Pedido #{order.id.slice(0, 8)}
                        </CardTitle>
                        <CardDescription>
                          {formatDate(order.created_at)}
                        </CardDescription>
                      </div>
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {order.order_items?.length} producto(s)
                      </div>
                      <div className="font-semibold text-primary">
                        {formatPrice(order.total)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No tenes pedidos todavia</h3>
            <p className="text-muted-foreground mb-4">
              Cuando hagas tu primer pedido, aparecera aca
            </p>
            <Link
              href="/"
              className="text-primary hover:underline font-medium"
            >
              Empezar a comprar
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
