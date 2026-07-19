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

// Pedidos que todavía requieren atención. Uno que ya está "completed"
// o "cancelled" no tiene sentido que siga apareciendo en la campanita.
const ACTIVE_STATUSES = ['pending', 'preparing', 'ready']

/**
 * Beep de aviso generado con el propio navegador (Web Audio API), sin
 * depender de ningún archivo .mp3. Los navegadores no dejan reproducir
 * audio hasta que hubo alguna interacción del usuario con la página
 * (click, tecla, etc.), así que dejamos el AudioContext listo desde el
 * primer click y lo reusamos siempre.
 */
let sharedAudioCtx: AudioContext | null = null

function primeAudio() {
  if (!sharedAudioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (Ctx) sharedAudioCtx = new Ctx()
  }
  sharedAudioCtx?.resume().catch(() => {})
}

function playNewOrderBeep() {
  try {
    const ctx = sharedAudioCtx
    if (!ctx) return
    const now = ctx.currentTime
    // Dos tonos cortos, tipo "ding-dong", para que se note pero no moleste.
    ;[[880, now], [660, now + 0.18]].forEach(([freq, start]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq as number
      gain.gain.setValueAtTime(0.0001, start as number)
      gain.gain.exponentialRampToValueAtTime(0.35, (start as number) + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, (start as number) + 0.16)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start as number)
      osc.stop((start as number) + 0.18)
    })
  } catch (e) {
    console.error('[notif] no se pudo reproducir el sonido:', e)
  }
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<any>(null)
  const subscribedRef = useRef(false)

  const unread = notifications.filter(n => !n.is_read).length

  const loadNotifications = async () => {
    // Traemos las notificaciones junto con el estado actual del pedido
    // al que pertenecen, para poder dejar afuera las de pedidos que ya
    // se completaron o cancelaron.
    const { data, error } = await supabase
      .from('notifications')
      .select('*, orders(status)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[notif] error cargando notificaciones:', error.message)
      return
    }

    const active = (data || []).filter((n: any) => {
      // Si por algo no se pudo traer el pedido relacionado, la dejamos
      // ver en vez de esconderla de más.
      if (!n.order_id || !n.orders) return true
      return ACTIVE_STATUSES.includes(n.orders.status)
    })
    setNotifications(active.slice(0, 20))
  }

  useEffect(() => {
    // "Desbloquea" el audio en el primer click/tecla en cualquier lado
    // de la página, para que después el beep pueda sonar sin que el
    // navegador lo bloquee.
    const unlock = () => primeAudio()
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })

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
      // Un pedido recién creado siempre arranca activo, así que esta
      // sí la sumamos directo a la lista.
      setNotifications(prev => [n, ...prev])
      toast.info(n.title, { description: n.message })
      playNewOrderBeep()
    })

    // Cuando un pedido cambia de estado (por ejemplo, lo marcás como
    // completado desde /admin), si ya no está activo lo sacamos de la
    // campanita para que no quede colgado ahí para siempre.
    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
    }, (payload: any) => {
      const order = payload.new as { id: string; status: string }
      if (!ACTIVE_STATUSES.includes(order.status)) {
        setNotifications(prev => prev.filter(n => n.order_id !== order.id))
      }
    })

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel
      }
    })

    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
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