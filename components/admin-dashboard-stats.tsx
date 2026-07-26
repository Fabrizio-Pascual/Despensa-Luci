'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, ShoppingCart, AlertTriangle, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function AdminDashboardStats() {
  const supabase = createClient()
  const [stats, setStats] = useState({
    salesToday: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
    newCustomersToday: 0,
    last7DaysSales: [] as { date: string; total: number }[]
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Ventas de hoy
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('status', 'completed')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)

      const salesToday = todayOrders?.reduce((sum: number, order: { total: number }) => sum + order.total, 0) || 0

      // Pedidos pendientes
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .in('status', ['pending', 'preparing'])

      // Productos con stock bajo
      const { count: lowStockCount } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq('is_active', true)
        .lt('stock', 5)

      // Clientes nuevos hoy
      const { data: newProfiles } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)

      // Últimos 7 días de ventas
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        const { data: dayOrders } = await supabase
          .from('orders')
          .select('total')
          .eq('status', 'completed')
          .gte('created_at', `${dateStr}T00:00:00`)
          .lt('created_at', `${dateStr}T23:59:59`)

        const dayTotal = dayOrders?.reduce((sum: number, order: { total: number }) => sum + order.total, 0) || 0
        last7Days.push({ date: dateStr, total: dayTotal })
      }

      setStats({
        salesToday,
        pendingOrders: pendingCount || 0,
        lowStockProducts: lowStockCount || 0,
        newCustomersToday: newProfiles?.length || 0,
        last7DaysSales: last7Days
      })
    } catch (error) {
      console.error('Error loading admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-8">Cargando...</div>

  const statItems = [
    {
      icon: TrendingUp,
      label: 'Ventas Hoy',
      value: `$${stats.salesToday.toFixed(2)}`,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      icon: ShoppingCart,
      label: 'Pedidos Pendientes',
      value: stats.pendingOrders,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      icon: AlertTriangle,
      label: 'Stock Bajo',
      value: stats.lowStockProducts,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10'
    },
    {
      icon: Users,
      label: 'Clientes Nuevos',
      value: stats.newCustomersToday,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item, idx) => {
          const Icon = item.icon
          return (
            <div
              key={idx}
              className={`${item.bg} border border-border rounded-lg p-6 hover:border-primary/50 transition-colors`}
            >
              <Icon className={`h-6 w-6 ${item.color} mb-3`} />
              <p className="text-sm text-muted-foreground mb-2">{item.label}</p>
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          )
        })}
      </div>

      {/* Gráfico simple de últimos 7 días */}
      <div className="glass rounded-lg p-6 border border-border">
        <h3 className="text-lg font-semibold mb-4">Ventas - Últimos 7 Días</h3>
        <div className="flex items-end justify-between h-40 gap-2">
          {stats.last7DaysSales.map((day, idx) => {
            const maxSale = Math.max(...stats.last7DaysSales.map(d => d.total), 1)
            const percentage = (day.total / maxSale) * 100
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div className="w-full bg-muted rounded-t relative group">
                  <div
                    className="w-full bg-gradient-to-t from-primary to-primary/70 rounded-t transition-all hover:from-primary/80 hover:to-primary/60"
                    style={{ height: `${percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-semibold text-white bg-black/70 px-2 py-1 rounded">
                      ${day.total.toFixed(0)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('es-AR', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}