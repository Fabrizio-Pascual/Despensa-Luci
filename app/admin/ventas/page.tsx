'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, CreditCard, Banknote, FileText, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import type { Order, Profile } from '@/lib/types'

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

const paymentIcons = {
  efectivo: Banknote,
  debito: CreditCard,
  boucher: FileText,
}

const paymentLabels = {
  efectivo: 'Efectivo',
  debito: 'Debito',
  boucher: 'Fiado',
}

type OrderWithProfile = Order & { profile: Profile }

export default function AdminSalesPage() {
  const [orders, setOrders] = useState<OrderWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const supabase = createClient()

  const loadOrders = useCallback(async () => {
    let query = supabase
      .from('orders')
      .select('*, profile:profiles(*)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    const now = new Date()
    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      query = query.gte('created_at', startOfDay)
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', weekAgo)
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', monthAgo)
    }

    const { data } = await query
    setOrders(data || [])
    setIsLoading(false)
  }, [supabase, period])

  useEffect(() => {
    loadOrders()

    // Realtime subscription
    const channel = supabase
      .channel('sales-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, loadOrders])

  const totalSales = orders.reduce((sum, o) => sum + o.total, 0)
  const totalEfectivo = orders.filter(o => o.payment_method === 'efectivo').reduce((sum, o) => sum + o.total, 0)
  const totalDebito = orders.filter(o => o.payment_method === 'debito').reduce((sum, o) => sum + o.total, 0)
  const totalBoucher = orders.filter(o => o.payment_method === 'boucher').reduce((sum, o) => sum + o.total, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-muted-foreground">Estadisticas y registro de ventas en tiempo real</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="all">Todo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total ventas</p>
                <p className="text-2xl font-bold">{formatPrice(totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-success/10 p-3">
                <Banknote className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Efectivo</p>
                <p className="text-2xl font-bold">{formatPrice(totalEfectivo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Debito</p>
                <p className="text-2xl font-bold">{formatPrice(totalDebito)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <FileText className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fiado</p>
                <p className="text-2xl font-bold">{formatPrice(totalBoucher)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de ventas</CardTitle>
          <CardDescription>{orders.length} ventas en el periodo seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Metodo</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay ventas en este periodo
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const PaymentIcon = paymentIcons[order.payment_method as keyof typeof paymentIcons] || DollarSign
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id.slice(0, 8)}</TableCell>
                      <TableCell>{order.profile?.full_name || 'Cliente'}</TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <PaymentIcon className="h-3 w-3" />
                          {paymentLabels[order.payment_method as keyof typeof paymentLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(order.total)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
