'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Clock, CheckCircle, Package, XCircle, AlertCircle, Hash, ChevronRight, Candy, CheckCircle2, XCircle as XCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { OrderChat } from '@/components/order-chat'

const statusConfig = {
  pending:   { label: 'Pendiente',          icon: Clock,        variant: 'secondary'   as const },
  preparing: { label: 'Preparando',         icon: Package,      variant: 'default'     as const },
  ready:     { label: 'Listo para retirar', icon: AlertCircle,  variant: 'default'     as const },
  completed: { label: 'Completado',         icon: CheckCircle,  variant: 'outline'     as const },
  cancelled: { label: 'Cancelado',          icon: XCircle,      variant: 'destructive' as const },
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
  const [cambioDialog, setCambioDialog] = useState(false)
  const [cambioItem, setCambioItem] = useState('')
  const [cambioMonto, setCambioMonto] = useState('')
  const [sendingCambio, setSendingCambio] = useState(false)
  const [adminId, setAdminId] = useState<string | null>(null)
  const channelRef = useRef<any>(null)
  const subscribedRef = useRef(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const load = async () => {
      const { id } = await params
      const { data: { user } } = await supabase.auth.getUser()
      setAdminId(user?.id || null)
      const { data } = await supabase
        .from('orders')
        .select('*, profile:profiles(*), order_items(*, product:products(name, price, image_url))')
        .eq('id', id)
        .single()

      setOrder(data)
      setLoading(false)

      if (subscribedRef.current) return
      subscribedRef.current = true

      const channel = supabase.channel(`admin-order-${id}-${Date.now()}`)
      channel.on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}`
      }, (payload: any) => {
        setOrder((prev: any) => ({ ...prev, ...payload.new }))
        if (payload.new.cambio_respuesta && payload.new.cambio_respuesta !== payload.old?.cambio_respuesta) {
          const aceptado = payload.new.cambio_respuesta === 'aceptado'
          toast[aceptado ? 'success' : 'warning'](
            aceptado ? '✓ El cliente aceptó el cambio propuesto' : '✗ El cliente no aceptó el cambio propuesto'
          )
        }
      })
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') channelRef.current = channel
      })
    }
    load()
    return () => {
      subscribedRef.current = false
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
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
      if (newStatus === 'ready' && order.profile?.id) {
        try {
          await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: order.profile.id,
              title: '🛒 Tu pedido está listo',
              body: `Pedido #${order.id.slice(0, 8)} — Podés venir a retirarlo`,
              url: `/dashboard/pedidos/${order.id}`
            })
          })
        } catch {}
      }
    }
    setUpdating(false)
  }

  const sendCambioMessage = async () => {
    if (!cambioItem.trim() || !cambioMonto) {
      toast.error('Completá el producto y el monto')
      return
    }
    setSendingCambio(true)
    try {
      // Guardar la propuesta en la orden para que el cliente vea los botones
      await supabase.from('orders').update({
        cambio_propuesta: cambioItem.trim(),
        cambio_monto: parseFloat(cambioMonto),
        cambio_respuesta: null,
      }).eq('id', order.id)

      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: order.profile?.id,
          title: '💬 No tenemos cambio exacto',
          body: `¿Te parece bien recibir ${formatPrice(parseFloat(cambioMonto))} en ${cambioItem.trim()}?`,
          url: `/dashboard/pedidos/${order.id}`
        })
      })
      toast.success(`Propuesta enviada a ${order.profile?.full_name}`)
      setCambioDialog(false)
      setCambioItem('')
      setCambioMonto('')
    } catch {
      toast.error('Error al enviar el mensaje')
    } finally {
      setSendingCambio(false)
    }
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
  const isEfectivo = order.payment_method === 'efectivo'
  const notasCambio = order.notes?.includes('Paga con:') ? order.notes.split('|').find((n: string) => n.includes('Paga con:'))?.trim() : null

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

      {isActive && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-primary">Código de retiro</p>
            </div>
            <p className="text-4xl font-mono font-bold tracking-widest text-primary">
              {order.order_code || order.id.slice(0, 6).toUpperCase()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Verificá con el cliente al entregar</p>
          </CardContent>
        </Card>
      )}

      {isEfectivo && notasCambio && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">{notasCambio}</p>
          </CardContent>
        </Card>
      )}

      {/* Estado de la propuesta de cambio */}
      {order.cambio_propuesta && (
        <Card className={
          order.cambio_respuesta === 'aceptado' ? 'border-green-500/40 bg-green-500/5' :
          order.cambio_respuesta === 'rechazado' ? 'border-destructive/40 bg-destructive/5' :
          'border-yellow-500/40 bg-yellow-500/5'
        }>
          <CardContent className="p-4 space-y-1">
            <p className="text-sm font-medium">
              Propuesta enviada: {formatPrice(order.cambio_monto)} en <strong>{order.cambio_propuesta}</strong>
            </p>
            {order.cambio_respuesta === 'aceptado' && (
              <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> El cliente aceptó
              </p>
            )}
            {order.cambio_respuesta === 'rechazado' && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <XCircleIcon className="h-4 w-4" /> El cliente no aceptó — coordiná otra solución
              </p>
            )}
            {!order.cambio_respuesta && (
              <p className="text-xs text-muted-foreground">Esperando respuesta del cliente...</p>
            )}
          </CardContent>
        </Card>
      )}

      {isEfectivo && isActive && (
        <Button
          variant="outline"
          className="w-full gap-2 border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
          onClick={() => setCambioDialog(true)}
        >
          <Candy className="h-4 w-4" />
          No tengo cambio — proponer al cliente
        </Button>
      )}

      {next && (
        <Button size="lg" className="w-full text-base" onClick={() => updateStatus(next.status)} disabled={updating}>
          {updating ? 'Actualizando...' : next.label}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      )}

      <Card>
        <CardHeader><CardTitle>Productos del pedido</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {item.product?.image_url ? (
                  <Image src={item.product.image_url} alt={item.product?.name || ''} fill className="object-contain p-1" unoptimized />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {item.product?.name}
                  {item.variant_name && <span className="text-primary font-semibold"> · {item.variant_name}</span>}
                </p>
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
              <span className="font-medium text-right max-w-xs text-sm">{order.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {['pending', 'preparing'].includes(order.status) && (
        <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive hover:text-white" onClick={cancelOrder} disabled={updating}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar pedido
        </Button>
      )}

      {order.profile?.id && (
        <OrderChat
          orderId={order.id}
          currentUserId={adminId || ''}
          isAdmin
          notifyUserId={order.profile.id}
        />
      )}

      {/* Dialog con input libre para producto y monto */}
      <Dialog open={cambioDialog} onOpenChange={setCambioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proponer vuelto en productos</DialogTitle>
            <DialogDescription>
              Indicá qué le ofrecés al cliente y por cuánto. Se le va a preguntar si acepta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>¿Qué le ofrecés?</Label>
              <Input
                placeholder="Ej: caramelos, un alfajor, chicles..."
                value={cambioItem}
                onChange={e => setCambioItem(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto del vuelto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  placeholder="200"
                  value={cambioMonto}
                  onChange={e => setCambioMonto(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCambioDialog(false)}>Cancelar</Button>
            <Button onClick={sendCambioMessage} disabled={sendingCambio}>
              {sendingCambio ? 'Enviando...' : 'Enviar propuesta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}