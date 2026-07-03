'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Clock, CheckCircle, Package, XCircle, AlertCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Order, OrderItem, Product, Profile } from '@/lib/types'
import { jsPDF } from 'jspdf'

const statusConfig = {
  pending: { label: 'Pendiente', icon: Clock, variant: 'secondary' as const },
  preparing: { label: 'Preparando', icon: Package, variant: 'default' as const },
  ready: { label: 'Listo', icon: AlertCircle, variant: 'default' as const },
  completed: { label: 'Completado', icon: CheckCircle, variant: 'outline' as const },
  cancelled: { label: 'Cancelado', icon: XCircle, variant: 'destructive' as const },
}

const paymentLabels = {
  efectivo: 'Efectivo',
  debito: 'Debito',
  boucher: 'Fiado',
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
    hour: '2-digit',
    minute: '2-digit'
  })
}

type OrderWithDetails = Order & {
  profile: Profile
  order_items: (OrderItem & { product: Product })[]
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const supabase = createClient()

  const loadOrders = useCallback(async () => {
    let query = supabase
      .from('orders')
      .select('*, profile:profiles(*), order_items(*, product:products(*))')
      .order('created_at', { ascending: false })

    if (filterStatus === 'active') {
      query = query.in('status', ['pending', 'preparing', 'ready'])
    } else if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading orders:', error)
      toast.error('Error al cargar pedidos')
    } else {
      setOrders(data || [])
    }
    setIsLoading(false)
  }, [supabase, filterStatus])

  useEffect(() => {
    loadOrders()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, loadOrders])

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error

      toast.success(`Pedido actualizado a: ${statusConfig[newStatus as keyof typeof statusConfig].label}`)
      
      if (newStatus === 'completed') {
        const order = orders.find(o => o.id === orderId)
        if (order) {
          generateReceipt(order)
        }
      }

      loadOrders()
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Error al actualizar pedido')
    }
  }

  const generateReceipt = (order: OrderWithDetails) => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.text('Despensa Luci', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text('Comprobante de Venta', 105, 30, { align: 'center' })
    
    // Order info
    doc.setFontSize(10)
    doc.text(`Pedido: #${order.id.slice(0, 8)}`, 20, 45)
    doc.text(`Fecha: ${formatDate(order.created_at)}`, 20, 52)
    doc.text(`Cliente: ${order.profile?.full_name || 'N/A'}`, 20, 59)
    doc.text(`Pago: ${paymentLabels[order.payment_method as keyof typeof paymentLabels]}`, 20, 66)
    
    // Line
    doc.line(20, 72, 190, 72)
    
    // Items header
    doc.setFontSize(10)
    doc.text('Producto', 20, 80)
    doc.text('Cant.', 120, 80)
    doc.text('Precio', 145, 80)
    doc.text('Subtotal', 170, 80)
    
    // Items
    let y = 88
    order.order_items?.forEach((item) => {
      doc.text(item.product?.name?.substring(0, 35) || 'N/A', 20, y)
      doc.text(item.quantity.toString(), 125, y)
      doc.text(formatPrice(item.unit_price), 145, y)
      doc.text(formatPrice(item.subtotal), 170, y)
      y += 7
    })
    
    // Total
    doc.line(20, y + 2, 190, y + 2)
    doc.setFontSize(12)
    doc.text(`Total: ${formatPrice(order.total)}`, 170, y + 12, { align: 'right' })
    
    // Footer
    doc.setFontSize(10)
    doc.text('Gracias por tu compra! Vuelve pronto.', 105, y + 30, { align: 'center' })
    
    // Download
    doc.save(`comprobante-${order.id.slice(0, 8)}.pdf`)
    toast.success('Comprobante descargado')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const preparingCount = orders.filter(o => o.status === 'preparing').length
  const readyCount = orders.filter(o => o.status === 'ready').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gestiona los pedidos de tus clientes</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">🟢 Activos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="preparing">Preparando</SelectItem>
            <SelectItem value="ready">Listos</SelectItem>
            <SelectItem value="completed">Completados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{preparingCount}</p>
              <p className="text-sm text-muted-foreground">Preparando</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-warning" />
            <div>
              <p className="text-2xl font-bold">{readyCount}</p>
              <p className="text-sm text-muted-foreground">Listos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No hay pedidos</h3>
              <p className="text-muted-foreground">Los pedidos apareceran aca</p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => {
            const status = statusConfig[order.status as keyof typeof statusConfig]
            const StatusIcon = status.icon

            return (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Pedido #{order.id.slice(0, 8)}
                      </CardTitle>
                      <CardDescription>
                        {order.profile?.full_name || 'Cliente'} - {formatDate(order.created_at)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                      <Badge variant="outline">
                        {paymentLabels[order.payment_method as keyof typeof paymentLabels]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {order.order_items?.length} producto(s) - {formatPrice(order.total)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/pedidos/${order.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver y gestionar
                        </Link>
                      </Button>
                      {order.status === 'pending' && (
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                          Preparar
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, 'ready')}>
                          Listo
                        </Button>
                      )}
                      {order.status === 'ready' && (
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, 'completed')}>
                          Entregar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pedido #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>
              {selectedOrder?.profile?.full_name} - {selectedOrder && formatDate(selectedOrder.created_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Código de verificación */}
            <div className="bg-primary/5 border border-primary/30 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Código de retiro</p>
              <p className="text-3xl font-mono font-bold tracking-widest text-primary">
                {(selectedOrder as any)?.order_code || selectedOrder?.id.slice(0, 6).toUpperCase()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Verificá este código con el cliente al entregar</p>
            </div>

            {selectedOrder?.order_items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.product?.name}</span>
                <span>{formatPrice(item.subtotal)}</span>
              </div>
            ))}
            <div className="border-t pt-4 flex justify-between font-semibold">
              <span>Total</span>
              <span>{selectedOrder && formatPrice(selectedOrder.total)}</span>
            </div>
            {selectedOrder?.notes && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <span className="font-medium">Notas:</span> {selectedOrder.notes}
              </div>
            )}
          </div>
          <DialogFooter>
            {selectedOrder?.status === 'completed' && (
              <Button onClick={() => selectedOrder && generateReceipt(selectedOrder)}>
                Descargar comprobante
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}