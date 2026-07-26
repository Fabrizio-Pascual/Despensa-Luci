'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, TrendingUp, Zap, AlertCircle } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/client'

interface CustomerStatsProps {
  className?: string
}

export function CustomerStats({ className = '' }: CustomerStatsProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    loyaltyPoints: 0,
    outstandingDebts: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    loadStats()
  }, [user])

  const loadStats = async () => {
    if (!user) return
    try {
      // Total de órdenes
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      const totalOrders = orders?.length || 0
      const totalSpent = orders?.reduce((sum: number, order: { total: number }) => sum + order.total, 0) || 0

      // Puntos de lealtad
      const { data: loyalty } = await supabase
        .from('user_loyalty_points')
        .select('points_balance')
        .eq('user_id', user.id)
        .single()

      // Deudas pendientes
      const { data: debts } = await supabase
        .from('debts')
        .select('amount, paid_amount')
        .eq('user_id', user.id)
        .eq('is_paid', false)

      const outstandingDebts = debts?.reduce((sum: number, debt: { amount: number; paid_amount: number }) => sum + (debt.amount - debt.paid_amount), 0) || 0

      setStats({
        totalOrders,
        totalSpent,
        loyaltyPoints: loyalty?.points_balance || 0,
        outstandingDebts
      })
    } catch (error) {
      console.error('Error loading customer stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !user) return null

  const statItems = [
    {
      icon: ShoppingBag,
      label: 'Compras',
      value: stats.totalOrders,
      color: 'text-blue-500'
    },
    {
      icon: TrendingUp,
      label: 'Total Gastado',
      value: `$${stats.totalSpent.toFixed(2)}`,
      color: 'text-green-500'
    },
    {
      icon: Zap,
      label: 'Puntos',
      value: stats.loyaltyPoints,
      color: 'text-yellow-500'
    },
    ...(stats.outstandingDebts > 0
      ? [{
          icon: AlertCircle,
          label: 'Deuda Pendiente',
          value: `$${stats.outstandingDebts.toFixed(2)}`,
          color: 'text-red-500'
        }]
      : [])
  ]

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {statItems.map((item, idx) => {
        const Icon = item.icon
        return (
          <div
            key={idx}
            className="glass rounded-lg p-4 border border-border hover:border-primary/50 transition-colors"
          >
            <Icon className={`h-5 w-5 ${item.color} mb-2`} />
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className="text-lg font-bold text-foreground">{item.value}</p>
          </div>
        )
      })}
    </div>
  )
}