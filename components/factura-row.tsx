'use client'

import { FileDown, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateReceipt } from '@/lib/receipt'
import type { Order } from '@/lib/types'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function FacturaRow({ order }: { order: Order }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-[24px] bg-card border border-border/40 premium-transition card-hover">
      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Package className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground">Pedido #{order.id.slice(0, 8)}</p>
        <p className="text-sm text-muted-foreground">{formatDate(order.created_at)} · {order.order_items?.length || 0} producto(s)</p>
      </div>
      <p className="font-bold text-primary hidden sm:block">{formatPrice(order.total)}</p>
      <Button variant="outline" size="sm" className="rounded-xl gap-2 shrink-0" onClick={() => generateReceipt(order)}>
        <FileDown className="h-4 w-4" />
        <span className="hidden sm:inline">Descargar</span>
      </Button>
    </div>
  )
}
