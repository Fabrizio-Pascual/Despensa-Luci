'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/client'
import type { LoyaltyPoints } from '@/lib/types'

export function LoyaltyStatus() {
  const { user } = useAuth()
  const supabase = createClient()
  const [loyalty, setLoyalty] = useState<LoyaltyPoints | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    loadLoyaltyPoints()
  }, [user])

  const loadLoyaltyPoints = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('user_loyalty_points')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No existe, crear uno nuevo
          await supabase
            .from('user_loyalty_points')
            .insert({
              user_id: user.id,
              points_balance: 0,
              total_points_earned: 0,
              total_points_used: 0
            })
          setLoyalty(null)
        } else {
          throw error
        }
      } else {
        setLoyalty(data)
      }
    } catch (error) {
      console.error('Error loading loyalty points:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user || loading || !loyalty) return null

  const nextMilestone = Math.ceil(loyalty.points_balance / 100) * 100
  const progressPercent = (loyalty.points_balance % 100) / 100 * 100

  return (
    <div className="glass rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" fill="currentColor" />
          <span className="font-semibold text-foreground">Mis Puntos</span>
        </div>
        <span className="text-2xl font-bold text-primary">
          {loyalty.points_balance}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="mb-2">
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{loyalty.points_balance} / {nextMilestone} puntos</span>
        <span className="text-primary font-semibold">
          {nextMilestone - loyalty.points_balance} para siguiente nivel
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        Ganaste {loyalty.total_points_earned} puntos en total
      </p>
    </div>
  )
}