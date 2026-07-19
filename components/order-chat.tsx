'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

interface OrderMessage {
  id: string
  order_id: string
  sender_id: string
  sender_role: 'admin' | 'cliente'
  message: string
  created_at: string
}

interface OrderChatProps {
  orderId: string
  currentUserId: string
  isAdmin: boolean
  /** id del otro usuario a notificar (para el admin: id del cliente; para el cliente: id de algún admin) */
  notifyUserId?: string | null
}

export function OrderChat({ orderId, currentUserId, isAdmin, notifyUserId }: OrderChatProps) {
  const [messages, setMessages] = useState<OrderMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const bottomRef = useRef<HTMLDivElement>(null)
  const subscribedRef = useRef(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
      setMessages(data || [])
    }
    load()

    if (subscribedRef.current) return
    subscribedRef.current = true
    const channel = supabase.channel(`order-chat-${orderId}-${Date.now()}`)
    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}`
    }, (payload: any) => {
      setMessages(prev => [...prev, payload.new as OrderMessage])
    })
    channel.subscribe()

    return () => {
      subscribedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [orderId, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const { error } = await supabase.from('order_messages').insert({
        order_id: orderId,
        sender_id: currentUserId,
        sender_role: isAdmin ? 'admin' : 'cliente',
        message: text.trim(),
      })
      if (error) throw error

      if (notifyUserId) {
        try {
          await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: notifyUserId,
              title: isAdmin ? '💬 Mensaje sobre tu pedido' : '💬 Mensaje de un cliente',
              body: text.trim().slice(0, 120),
              url: isAdmin ? `/dashboard/pedidos/${orderId}` : `/admin/pedidos/${orderId}`,
            }),
          })
        } catch {}
      }
      setText('')
    } catch {
      // si falla, el usuario puede reintentar; no rompemos la UI
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" />
          Comunicación sobre el pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? 'Escribile al cliente si falta stock o hay que modificar algo del pedido.'
                : 'Acá vas a ver los avisos si algo de tu pedido cambia.'}
            </p>
          )}
          {messages.map(m => {
            const mine = m.sender_id === currentUserId
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <p>{m.message}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {m.sender_role === 'admin' ? 'Despensa Luci' : 'Cliente'} · {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={isAdmin ? 'Ej: no tengo tomates, ¿lo cambio por...?' : 'Escribí tu mensaje...'}
            className="min-h-[44px] resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
          />
          <Button onClick={send} disabled={sending || !text.trim()} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}