'use client'

import { createClient } from '@/lib/supabase/client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export type PushStatus = 'unsupported' | 'denied' | 'granted' | 'default'

/** Estado actual del permiso de notificaciones en este navegador. */
export function getPushStatus(): PushStatus {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission as PushStatus
}

/**
 * Intenta suscribir al usuario actual a notificaciones push y guarda la
 * suscripción en Supabase. Se usa tanto para el intento automático y
 * silencioso al entrar al dashboard, como para el botón manual "Activar
 * notificaciones" (por si el navegador nunca mostró el permiso solo,
 * algo que pasa seguido: muchos navegadores exigen un click real del
 * usuario para mostrar el diálogo, o si ya lo habían cerrado/ignorado
 * una vez no lo vuelven a mostrar solos).
 */
export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' }
  }

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, reason: 'no-user' }

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, reason: permission }

    const existing = await reg.pushManager.getSubscription()
    const subscription = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const subJson = JSON.parse(JSON.stringify(subscription))

    // Cada dispositivo se identifica por su propio "endpoint", así un
    // mismo usuario puede tener PC y celular suscriptos a la vez.
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      subscription: subJson,
      endpoint: subJson.endpoint,
    }, { onConflict: 'endpoint' })

    if (error) {
      console.error('[push] no se pudo guardar la suscripción:', error)
      return { ok: false, reason: 'save-failed' }
    }

    return { ok: true }
  } catch (err) {
    console.error('[push] error al suscribir:', err)
    return { ok: false, reason: 'error' }
  }
}