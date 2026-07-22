'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getPushStatus, subscribeToPush, type PushStatus } from '@/lib/push'
import { toast } from 'sonner'

export function NotificationsToggle() {
  const [status, setStatus] = useState<PushStatus>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setStatus(getPushStatus())
  }, [])

  const handleEnable = async () => {
    setLoading(true)
    const res = await subscribeToPush()
    setLoading(false)
    setStatus(getPushStatus())

    if (res.ok) {
      toast.success('¡Notificaciones activadas! Te vamos a avisar cuando tu pedido cambie de estado.')
    } else if (res.reason === 'denied') {
      toast.error('Bloqueaste las notificaciones para este sitio. Activalas desde el candado en la barra de direcciones de tu navegador.')
    } else {
      toast.error('No se pudo activar. Probá de nuevo en un momento.')
    }
  }

  if (status === 'unsupported') return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {status === 'granted' ? (
            <BellRing className="h-5 w-5 text-primary" />
          ) : status === 'denied' ? (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          Notificaciones
        </CardTitle>
        <CardDescription>
          {status === 'granted'
            ? 'Están activadas en este dispositivo. Vas a recibir un aviso cuando tu pedido cambie de estado.'
            : status === 'denied'
            ? 'Bloqueaste las notificaciones para este sitio. Para activarlas, tocá el candado (🔒) en la barra de direcciones de tu navegador, permití las notificaciones, y volvé a esta página.'
            : 'Activalas para enterarte apenas tu pedido esté "Listo para retirar", sin tener que estar mirando la página.'}
        </CardDescription>
      </CardHeader>
      {status !== 'denied' && (
        <CardContent>
          <Button onClick={handleEnable} disabled={loading} variant={status === 'granted' ? 'outline' : 'default'}>
            <Bell className="h-4 w-4 mr-2" />
            {loading ? 'Activando...' : status === 'granted' ? 'Volver a activar en este dispositivo' : 'Activar notificaciones'}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}