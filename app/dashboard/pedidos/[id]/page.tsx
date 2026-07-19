'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle, Package, XCircle, AlertCircle, Hash, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { OrderChat } from '@/components/order-chat'
import { OrderEditor } from '@/components/order-editor'

const statusConfig = {
  pending:   { label: 'Pendiente',          icon: Clock,        variant: 'secondary'   as const },
  preparing: { label: 'Preparando',         icon: Package,      variant: 'default'     as const },
  ready:     { label: 'Listo para retirar', icon: AlertCircle,  variant: 'default'     as const },
  completed: { label: 'Completado',         icon: CheckCircle,  variant: 'outline'     as const },
  cancelled: { label: 'Cancelado',          icon: XCircle,      variant: 'destructive' as const },
}

const paymentLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  debito:   'Tarjeta de Débito',
  boucher:  'Fiado (Boucher)',
}

const steps = ['pending', 'preparing', 'ready', 'completed']
const stepLabels = ['Recibido', 'Preparando', 'Listo', 'Entregado']

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}
function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [respondiendo, setRespondiendo] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [adminId, setAdminId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let channel: any
    let mounted = true

    const load = async () => {
      const { id } = await params
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)

      const { data: adminProfile } = await supabase
        .from('profiles').select('id').eq('is_admin', true).limit(1).maybeSingle()
      setAdminId(adminProfile?.id || null)

      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(name, image_url))')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single()

      if (!mounted) return
      setOrder(data)
      setLoading(false)

      channel = supabase.channel(`order-${id}-${Date.now()}`)
      channel.on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}`,
      }, (payload: any) => {
        if (!mounted) return
        setOrder((prev: any) => ({ ...prev, ...payload.new }))
        const cfg = statusConfig[payload.new.status as keyof typeof statusConfig]
        if (cfg && payload.new.status !== payload.old?.status) toast.info(`Estado actualizado: ${cfg.label}`)
        if (payload.new.cambio_propuesta && payload.new.cambio_propuesta !== payload.old?.cambio_propuesta) {
          toast.info('💬 El local te propuso un cambio en productos')
        }
        if (payload.new.edit_unlocked && !payload.old?.edit_unlocked) {
          toast.info('✏️ Ahora podés editar tu pedido')
        }
      })
      channel.subscribe()
    }

    load()
    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const cancelOrder = async () => {
    setCancelling(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', order.id)
    if (error) toast.error('No se pudo cancelar el pedido')
    else toast.success('Pedido cancelado')
    setCancelling(false)
    setCancelDialog(false)
  }

  const responderCambio = async (respuesta: 'aceptado' | 'rechazado') => {
    setRespondiendo(true)
    const { error } = await supabase
      .from('orders')
      .update({ cambio_respuesta: respuesta })
      .eq('id', order.id)

    if (error) {
      toast.error('Error al enviar tu respuesta')
    } else {
      setOrder((prev: any) => ({ ...prev, cambio_respuesta: respuesta }))
      toast.success(respuesta === 'aceptado' ? '¡Gracias! Le avisamos al local' : 'Le avisamos al local que no aceptás')
    }
    setRespondiendo(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
  if (!order) return null

  const status = statusConfig[order.status as keyof typeof statusConfig]
  const StatusIcon = status.icon
  const canCancel = order.status === 'pending'
  const isActive = ['pending', 'preparing', 'ready'].includes(order.status)
  const isCancelled = order.status === 'cancelled'
  const currentStep = steps.indexOf(order.status)

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver a mis pedidos</Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pedido #{order.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground">{formatDate(order.created_at)}</p>
          </div>
          <Badge variant={status.variant} className="flex items-center gap-2 text-sm px-3 py-1">
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </Badge>
        </div>
      </div>

      {!isCancelled && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-4 h-0.5 bg-muted mx-8" />
              <div className="absolute left-8 top-4 h-0.5 bg-primary transition-all duration-500"
                style={{ width: currentStep >= 0 ? `${(currentStep / (steps.length - 1)) * 100}%` : '0%' }} />
              {steps.map((step, i) => {
                const done = currentStep >= i
                const active = currentStep === i
                const StepIcon = statusConfig[step as keyof typeof statusConfig].icon
                return (
                  <div key={step} className="flex flex-col items-center gap-2 relative z-10">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    } ${active ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <span className={`text-xs font-medium ${done ? 'text-primary' : 'text-muted-foreground'}`}>{stepLabels[i]}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isActive && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Hash className="h-5 w-5 text-primary" />
              <p className="font-semibold text-primary">Código de retiro</p>
              <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse ml-auto" />
            </div>
            <p className="text-4xl font-mono font-bold tracking-widest text-center py-2">
              {order.order_code || order.id.slice(0, 6).toUpperCase()}
            </p>
            <p className="text-xs text-center text-muted-foreground mt-1">Mostrá este código al retirar tu pedido</p>
          </CardContent>
        </Card>
      )}

      {/* Propuesta de vuelto en productos */}
      {order.cambio_propuesta && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="p-5 space-y-3">
            <p className="font-semibold text-foreground">
              💬 El local no tiene cambio exacto
            </p>
            <p className="text-sm text-muted-foreground">
              Te proponen darte <strong className="text-foreground">{formatPrice(order.cambio_monto)}</strong> de vuelto en <strong className="text-foreground">{order.cambio_propuesta}</strong>. ¿Estás de acuerdo?
            </p>

            {!order.cambio_respuesta ? (
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={() => responderCambio('aceptado')} disabled={respondiendo}>
                  <ThumbsUp className="h-4 w-4" />
                  Sí, acepto
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => responderCambio('rechazado')} disabled={respondiendo}>
                  <ThumbsDown className="h-4 w-4" />
                  No, prefiero otra cosa
                </Button>
              </div>
            ) : (
              <div className={`rounded-lg p-3 text-sm font-medium ${
                order.cambio_respuesta === 'aceptado'
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {order.cambio_respuesta === 'aceptado'
                  ? '✓ Aceptaste esta propuesta'
                  : '✗ Le avisamos al local que preferís otra cosa'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {order.status === 'ready' && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-primary" />
            <p className="font-medium">¡Tu pedido está listo para retirar en el local!</p>
          </CardContent>
        </Card>
      )}
      {order.status === 'completed' && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="font-medium text-foreground">¡Gracias por tu compra! Volvé pronto. 🧡</p>
          </CardContent>
        </Card>
      )}
      {order.status === 'cancelled' && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <p className="font-medium">Este pedido fue cancelado.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Productos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium">
                  {item.product?.name}
                  {item.variant_name && <span className="text-primary font-semibold"> · {item.variant_name}</span>}
                </p>
                <p className="text-sm text-muted-foreground">{item.quantity} x {formatPrice(item.unit_price)}</p>
              </div>
              <p className="font-medium">{formatPrice(item.subtotal)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Detalles del pedido</CardTitle></CardHeader>
        <CardContent className="space-y-4">
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
          <Separator />
          <div className="flex justify-between text-lg">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-primary">{formatPrice(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      {order.edit_unlocked && isActive && (
        <OrderEditor
          orderId={order.id}
          editNote={order.edit_note}
          adminId={adminId}
          items={order.order_items || []}
          onSaved={(newTotal, remainingItems) => {
            setOrder((prev: any) => ({
              ...prev,
              total: newTotal,
              edit_unlocked: false,
              order_items: remainingItems.map((it: any) => ({
                ...it,
                subtotal: it.quantity * it.unit_price,
              })),
            }))
          }}
        />
      )}

      {userId && (
        <OrderChat
          orderId={order.id}
          currentUserId={userId}
          isAdmin={false}
          notifyUserId={adminId}
        />
      )}

      {canCancel && (
        <Button variant="destructive" className="w-full" onClick={() => setCancelDialog(true)}>
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar pedido
        </Button>
      )}

      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar pedido?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialog(false)}>Volver</Button>
            <Button variant="destructive" onClick={cancelOrder} disabled={cancelling}>
              {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}