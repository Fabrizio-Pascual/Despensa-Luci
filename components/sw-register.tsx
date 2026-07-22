'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker en TODA la tienda (no solo en /admin o
 * /dashboard), sin pedir permiso de notificaciones acá. Esto es lo que
 * el navegador necesita para considerar la web "instalable" (PWA) y
 * ofrecer "Agregar a pantalla de inicio" / "Instalar app".
 *
 * El pedido de permiso de push (Notification.requestPermission) sigue
 * pasando solo en PushSubscriber (admin/dashboard), acá NO se pide nada.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[ServiceWorkerRegister] no se pudo registrar sw.js:', err)
    })
  }, [])

  return null
}