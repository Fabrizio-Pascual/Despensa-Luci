'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle, Package, XCircle, AlertCircle, Hash, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const statusConfig = {
  pending:   { label: 'Pendiente',        icon: Clock,        variant: 'secondary'    as const },
  preparing: { label: 'Preparando',       icon: Package,      variant: 'default'      as const },
  ready:     { label: 'Listo para retirar', icon: AlertCircle, variant: 'default'     as const },
  completed: { label: 'Completado',       icon: CheckCircle,  variant: 'outline'      as const },
  cancelled: { label: 'Cancelado',        icon: XCircle,      variant: 'destructive'  as const },
}

const nextStatus: Record<string, { status: string; label: string }> = {
  pending:   { status: 'preparing', label: '▶ Marcar como Preparando' },
  preparing: { status: 'ready',     label: '✓ Marcar como Listo' },
  ready:     { status: 'completed', label: '🏁 Marcar como Entregado' },
}

const paymentLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  debito:   'Tarjeta de Débito',
  boucher:  'Fiado (Boucher)',
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { id } = await params
      const { data } = await supabase
        .from('orders')
        .select('*, profile:profiles(*), order_items(*, product:products(name, price))')
        .eq('id', id)
        .single()

      setOrder(data)
      setLoading(false)

      // Realtime — canal creado ANTES del .on()
      const channel = supabase.channel(`admin-order-${id}-${Date.now()}`)
      channel.on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}`
      }, (payload) => {
        setOrder((prev: any) => ({ ...prev, ...payload.new }))
      })
      channel.subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    load()
  }, [])

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id)

    if (error) {
      toast.error('Error al actualizar el pedido')
    } else {
      const label = statusConfig[newStatus as keyof typeof statusConfig]?.label
      toast.success(`Pedido actualizado: ${label}`)
    }
    setUpdating(false)
  }

  const cancelOrder = async () => {
    if (!confirm('¿Cancelar este pedido?')) return
    setUpdating(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', order.id)
    if (error) toast.error('Error al cancelar')
    else toast.success('Pedido cancelado')
    setUpdating(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  if (!order) return <p>Pedido no encontrado.</p>

  const status = statusConfig[order.status as keyof typeof statusConfig]
  const StatusIcon = status.icon
  const next = nextStatus[order.status]
  const isActive = ['pending', 'preparing', 'ready'].includes(order.status)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Volver a pedidos</Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pedido #{order.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground">{formatDate(order.created_at)}</p>
            <p className="text-sm font-medium mt-1">
              Cliente: {order.profile?.full_name || 'Sin nombre'} · {order.profile?.phone || 'Sin teléfono'}
            </p>
          </div>
          <Badge variant={status.variant} className="flex items-center gap-2 text-sm px-3 py-1">
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Código de verificación */}
      {isActive && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-primary">Código de retiro — verificar con el cliente</p>
            </div>
            <p className="text-4xl font-mono font-bold tracking-widest text-primary">
              {order.order_code || order.id.slice(0, 6).toUpperCase()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* BOTONES DE AVANCE DE ESTADO */}
      {next && (
        <Button
          size="lg"
          className="w-full text-base"
          onClick={() => updateStatus(next.status)}
          disabled={updating}
        >
          {updating ? 'Actualizando...' : next.label}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      )}

      {/* Productos */}
      <Card>
        <CardHeader><CardTitle>Productos del pedido</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
              <div>
                <p className="font-medium">{item.product?.name}</p>
                <p className="text-sm text-muted-foreground">{item.quantity} x {formatPrice(item.unit_price)}</p>
              </div>
              <p className="font-semibold">{formatPrice(item.subtotal)}</p>
            </div>
          ))}
          <div className="flex justify-between pt-2">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-lg text-primary">{formatPrice(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Detalles */}
      <Card>
        <CardHeader><CardTitle>Detalles</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Método de pago</span>
            <span className="font-medium">{paymentLabels[order.payment_method] || order.payment_method}</span>
          </div>
          {order.notes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notas</span>
              <span className="font-medium text-right max-w-xs">{order.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancelar */}
      {['pending', 'preparing'].includes(order.status) && (
        <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive hover:text-white" onClick={cancelOrder} disabled={updating}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar pedido
        </Button>
      )}
    </div>
  )
}