'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle, Package, XCircle, AlertCircle, Hash, ChevronRight, Candy, PackageX, Undo2, Pencil, Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { notifyUser, ORDER_STATUS_NOTIF } from '@/lib/notify'
import { toast } from 'sonner'

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

// Opciones de vuelto en productos
const CAMBIO_OPTIONS = [
  { label: '🍬 Caramelos', value: 'caramelos', max: 500 },
  { label: '🍫 Alfajor', value: 'alfajor', max: 800 },
  { label: '🍭 Chicles', value: 'chicles', max: 400 },
]

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [cambioDialog, setCambioDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [editNote, setEditNote] = useState('')
  const [enablingEdit, setEnablingEdit] = useState(false)
  const [adminEditDialog, setAdminEditDialog] = useState(false)
  const [adminEditItems, setAdminEditItems] = useState<any[]>([])
  const [savingAdminEdit, setSavingAdminEdit] = useState(false)
  const channelRef = useRef<any>(null)
  const subscribedRef = useRef(false)
  const supabase = useMemo(() => createClient(), [])

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

      if (subscribedRef.current) return
      subscribedRef.current = true

      const channel = supabase.channel(`admin-order-${id}-${Date.now()}`)
      channel.on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}`
      }, (payload) => {
        setOrder((prev: any) => ({ ...prev, ...payload.new }))
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

      // Avisar al cliente en cada movimiento del pedido (no solo "listo")
      const notif = ORDER_STATUS_NOTIF[newStatus]
      if (notif && order.profile?.id) {
        notifyUser({
          userId: order.profile.id,
          title: notif.title,
          body: notif.body(order.id),
          url: `/dashboard/pedidos/${order.id}`,
        })
      }
    }
    setUpdating(false)
  }

  const sendCambioMessage = async (option: typeof CAMBIO_OPTIONS[0]) => {
    try {
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: order.profile?.id,
          title: '💬 Mensaje de Despensa Luci',
          body: `No tenemos cambio exacto. ¿Te parece bien que el vuelto sea en ${option.label}?`,
          url: `/dashboard/pedidos/${order.id}`
        })
      })
      toast.success(`Mensaje enviado a ${order.profile?.full_name}`)
      setCambioDialog(false)
    } catch {
      toast.error('Error al enviar el mensaje')
    }
  }

  // Le da acceso al cliente para que edite su propio pedido (por ejemplo,
  // cuando falta un producto). El cliente va a poder sacar renglones o
  // bajar cantidades desde su pantalla, y el total se recalcula solo.
  const enableEdit = async () => {
    setEnablingEdit(true)
    const { error } = await supabase
      .from('orders')
      .update({ edit_unlocked: true, edit_note: editNote.trim() || null })
      .eq('id', order.id)

    if (error) {
      toast.error('No se pudo habilitar la edición. Puede que falte crear la columna en la base (ver instrucciones).')
    } else {
      setOrder((prev: any) => ({ ...prev, edit_unlocked: true, edit_note: editNote.trim() || null }))
      toast.success('Le avisamos al cliente que puede editar su pedido')
      if (order.profile?.id) {
        notifyUser({
          userId: order.profile.id,
          title: '✏️ Podés modificar tu pedido',
          body: editNote.trim()
            ? `Nos falta "${editNote.trim()}". Podés sacarlo o ajustar tu pedido.`
            : 'Hay que ajustar algo de tu pedido. Podés editarlo vos mismo.',
          url: `/dashboard/pedidos/${order.id}`,
        })
      }
      setEditDialog(false)
      setEditNote('')
    }
    setEnablingEdit(false)
  }

  // Por si el admin se arrepiente antes de que el cliente llegue a tocarlo.
  const revokeEdit = async () => {
    const { error } = await supabase
      .from('orders')
      .update({ edit_unlocked: false })
      .eq('id', order.id)
    if (!error) {
      setOrder((prev: any) => ({ ...prev, edit_unlocked: false }))
      toast.success('Se canceló el permiso de edición')
    }
  }

  // Edición directa del admin sobre el pedido (ej: el cliente se arrepintió de algo).
  // A diferencia de "habilitar edición", esto lo hace el admin ahí mismo, sin pasar por el cliente.
  const openAdminEdit = () => {
    setAdminEditItems(order.order_items?.map((it: any) => ({ ...it })) || [])
    setAdminEditDialog(true)
  }

  const changeAdminQty = (itemId: string, delta: number) => {
    setAdminEditItems(prev => prev.map(it => it.id === itemId ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it))
  }

  const adminEditTotal = adminEditItems.filter(it => it.quantity > 0).reduce((sum, it) => sum + it.quantity * it.unit_price, 0)

  const saveAdminEdit = async () => {
    const remaining = adminEditItems.filter(it => it.quantity > 0)
    if (remaining.length === 0) { toast.error('No podés dejar el pedido vacío. Mejor cancelalo.'); return }
    setSavingAdminEdit(true)
    try {
      const toDelete = adminEditItems.filter(it => it.quantity === 0)
      const toUpdate = remaining.filter(it => {
        const original = order.order_items.find((o: any) => o.id === it.id)
        return original && original.quantity !== it.quantity
      })
      for (const it of toDelete) {
        const { error } = await supabase.from('order_items').delete().eq('id', it.id)
        if (error) throw error
      }
      for (const it of toUpdate) {
        const { error } = await supabase.from('order_items').update({ quantity: it.quantity, subtotal: it.quantity * it.unit_price }).eq('id', it.id)
        if (error) throw error
      }
      const { error: orderError } = await supabase.from('orders').update({ total: adminEditTotal }).eq('id', order.id)
      if (orderError) throw orderError

      setOrder((prev: any) => ({ ...prev, total: adminEditTotal, order_items: remaining }))
      toast.success('Pedido actualizado')

      if (order.profile?.id) {
        notifyUser({
          userId: order.profile.id,
          title: '✏️ Actualizamos tu pedido',
          body: `Ajustamos tu pedido #${order.id.slice(0, 8)} — nuevo total: ${formatPrice(adminEditTotal)}`,
          url: `/dashboard/pedidos/${order.id}`,
        })
      }
      setAdminEditDialog(false)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo guardar el cambio')
    } finally {
      setSavingAdminEdit(false)
    }
  }

  const cancelOrder = async () => {
    if (!confirm('¿Cancelar este pedido?')) return
    setUpdating(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', order.id)
    if (error) {
      toast.error('Error al cancelar')
    } else {
      toast.success('Pedido cancelado')
      const notif = ORDER_STATUS_NOTIF.cancelled
      if (order.profile?.id) {
        notifyUser({
          userId: order.profile.id,
          title: notif.title,
          body: notif.body(order.id),
          url: `/dashboard/pedidos/${order.id}`,
        })
      }
    }
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

  // Extraer info de cambio de las notas
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

      {/* Código de verificación */}
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

      {/* Info de pago efectivo */}
      {isEfectivo && notasCambio && (
        <Card className={notasCambio.includes('VUELTO ALTO') ? 'border-amber-500/40 bg-amber-500/10' : 'border-green-500/30 bg-green-500/5'}>
          <CardContent className="p-4">
            <p className={`text-sm font-medium ${notasCambio.includes('VUELTO ALTO') ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}>
              {notasCambio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Aviso de que el cliente puede editar el pedido en este momento */}
      {order.edit_unlocked && (
        <Card className="border-blue-500/40 bg-blue-500/5">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                ✏️ El cliente puede editar este pedido ahora mismo
              </p>
              {order.edit_note && (
                <p className="text-xs text-muted-foreground mt-0.5">Motivo: {order.edit_note}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="gap-1 shrink-0" onClick={revokeEdit}>
              <Undo2 className="h-3.5 w-3.5" />
              Revocar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Botón para habilitar que el cliente edite su pedido — para cuando falta stock de algo */}
      {isActive && !order.edit_unlocked && (
        <Button
          variant="outline"
          className="w-full gap-2 border-blue-500/50 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          onClick={() => setEditDialog(true)}
        >
          <PackageX className="h-4 w-4" />
          Falta un producto — dejar que el cliente edite el pedido
        </Button>
      )}

      {/* Botón vuelto en productos — solo para efectivo */}
      {isEfectivo && isActive && (
        <Button
          variant="outline"
          className="w-full gap-2 border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
          onClick={() => setCambioDialog(true)}
        >
          <Candy className="h-4 w-4" />
          No tengo cambio — avisar al cliente
        </Button>
      )}

      {/* Botón avance de estado */}
      {next && (
        <Button size="lg" className="w-full text-base" onClick={() => updateStatus(next.status)} disabled={updating}>
          {updating ? 'Actualizando...' : next.label}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      )}

      {/* Productos */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Productos del pedido</CardTitle>
          {isActive && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={openAdminEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          )}
        </CardHeader>
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
          <div className="flex justify-between pt-2 font-bold text-lg">
            <span>Total</span>
            <span className="text-primary">{formatPrice(order.total)}</span>
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
              <span className="font-medium text-right max-w-xs text-sm">{order.notes}</span>
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

      {/* Dialog vuelto en productos */}
      <Dialog open={cambioDialog} onOpenChange={setCambioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Dar vuelto en productos?</DialogTitle>
            <DialogDescription>
              Elegí con qué producto dar el vuelto. Se le enviará una notificación al cliente preguntándole si está de acuerdo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2">
            {CAMBIO_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                className="justify-start gap-3 h-14 text-base"
                onClick={() => sendCambioMessage(opt)}
              >
                <span className="text-2xl">{opt.label.split(' ')[0]}</span>
                <div className="text-left">
                  <p className="font-medium">{opt.label.split(' ').slice(1).join(' ')}</p>
                  <p className="text-xs text-muted-foreground">Hasta {formatPrice(opt.max)} de vuelto</p>
                </div>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCambioDialog(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog habilitar edición del pedido */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dejar editar el pedido al cliente</DialogTitle>
            <DialogDescription>
              El cliente va a poder sacar productos o bajar cantidades de este pedido desde su pantalla,
              y va a ver el nuevo total. Le avisamos con una notificación apenas confirmes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">¿Qué producto falta? (opcional)</label>
            <Input
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Ej: Tomate perita"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
            <Button onClick={enableEdit} disabled={enablingEdit}>
              {enablingEdit ? 'Habilitando...' : 'Habilitar edición'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog editar pedido directamente (admin) — por si el cliente se arrepiente de algo */}
      <Dialog open={adminEditDialog} onOpenChange={setAdminEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar productos del pedido</DialogTitle>
            <DialogDescription>
              Ajustá cantidades o sacá productos si el cliente se arrepintió de algo. Se guarda al instante y se le avisa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto">
            {adminEditItems.map((it) => (
              <div key={it.id} className={`flex items-center justify-between gap-2 ${it.quantity === 0 ? 'opacity-40' : ''}`}>
                <div className="min-w-0">
                  <p className="font-medium truncate">{it.product?.name}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(it.unit_price)} c/u</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeAdminQty(it.id, -1)} disabled={it.quantity === 0}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-6 text-center font-medium">{it.quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeAdminQty(it.id, 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setAdminEditItems(prev => prev.map(p => p.id === it.id ? { ...p, quantity: 0 } : p))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between items-center font-semibold py-1">
            <span>Nuevo total</span>
            <span className="text-lg text-primary">{formatPrice(adminEditTotal)}</span>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAdminEditDialog(false)}>Cancelar</Button>
            <Button onClick={saveAdminEdit} disabled={savingAdminEdit}>
              {savingAdminEdit ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}