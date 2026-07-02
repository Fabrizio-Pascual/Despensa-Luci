'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  order_id: string | null
  is_read: boolean
  created_at: string
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<any>(null)
  const subscribedRef = useRef(false)

  const unread = notifications.filter(n => !n.is_read).length

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  useEffect(() => {
    loadNotifications()

    // Evitar doble suscripción
    if (subscribedRef.current) return
    subscribedRef.current = true

    const channelName = `admin-notifs-${Math.random().toString(36).slice(2)}`
    const channel = supabase.channel(channelName)

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
    }, (payload: any) => {
      const n = payload.new as Notification
      setNotifications(prev => [n, ...prev])
      toast.info(n.title, { description: n.message })
    })

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel
      }
    })

    return () => {
      subscribedRef.current = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const formatTime = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (diff < 1) return 'Ahora'
    if (diff < 60) return `Hace ${diff} min`
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)}h`
    return new Date(date).toLocaleDateString('es-AR')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-sidebar-foreground hover:bg-sidebar-accent">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <p className="font-semibold text-sm">Notificaciones</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={markAllRead}>
              Marcar todo leído
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Sin notificaciones</p>
          ) : (
            notifications.map(n => (
              <Link
                key={n.id}
                href={n.order_id ? `/admin/pedidos/${n.order_id}` : '/admin'}
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 border-b hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-medium ${!n.is_read ? 'text-primary' : 'text-foreground'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(n.created_at)}</span>
                </div>
                {!n.is_read && <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary mt-1" />}
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}