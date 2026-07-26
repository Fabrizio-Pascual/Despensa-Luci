import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { FacturaRow } from '@/components/factura-row'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

export default async function FacturasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(name))')
    .eq('user_id', user!.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  const total = (orders || []).reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md text-foreground">Historial de Facturas</h1>
        <p className="text-muted-foreground">Todos tus comprobantes de compra, en un solo lugar</p>
      </div>

      {orders && orders.length > 0 ? (
        <>
          <div className="glass rounded-[24px] p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pedidos completados</p>
              <p className="text-2xl font-bold font-display text-foreground">{orders.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total histórico</p>
              <p className="text-2xl font-bold font-display text-primary">{formatPrice(total)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {orders.map((order) => (
              <FacturaRow key={order.id} order={order as any} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-[24px] bg-card border border-border/40 py-16 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg text-foreground mb-2">Todavía no tenés facturas</h3>
          <p className="text-muted-foreground">Cuando completes tu primer pedido, el comprobante va a aparecer acá</p>
        </div>
      )}
    </div>
  )
}
