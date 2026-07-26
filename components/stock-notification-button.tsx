'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface StockNotificationButtonProps {
  productId: string
  productName: string
}

export function StockNotificationButton({
  productId,
  productName
}: StockNotificationButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [isNotified, setIsNotified] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const checkExisting = async () => {
      const { data } = await supabase
        .from('stock_notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle()
      if (!cancelled) setIsNotified(!!data)
    }
    checkExisting()
    return () => { cancelled = true }
  }, [user, productId, supabase])

  const handleNotify = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('stock_notifications')
        .insert({
          user_id: user.id,
          product_id: productId,
          notified: false
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          // Ya existe la notificación
          await supabase
            .from('stock_notifications')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId)
          setIsNotified(false)
        } else {
          throw error
        }
      } else {
        setIsNotified(true)
      }
    } catch (error) {
      console.error('Error toggling notification:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleNotify}
      disabled={loading}
      className="w-full gap-2"
    >
      {isNotified ? (
        <>
          <BellOff className="h-4 w-4" />
          Dejar de notificar
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Notificarme cuando llegue
        </>
      )}
    </Button>
  )
}