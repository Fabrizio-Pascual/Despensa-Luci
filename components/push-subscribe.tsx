'use client'

import { useEffect } from 'react'
import { subscribeToPush } from '@/lib/push'

/**
 * Intento automático y silencioso de suscribir al usuario a push apenas
 * entra al dashboard/admin. Si el navegador no muestra el permiso solo
 * (pasa seguido), el usuario igual tiene el botón manual "Activar
 * notificaciones" en su perfil (ver NotificationsToggle).
 */
export function PushSubscriber() {
  useEffect(() => {
    subscribeToPush()
  }, [])

  return null
}