'use client'

import { useEffect } from 'react'
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

export function PushSubscriber() {
  useEffect(() => {
    const subscribe = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const existing = await reg.pushManager.getSubscription()
        const subscription = existing || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          subscription: JSON.parse(JSON.stringify(subscription)),
        }, { onConflict: 'user_id' })

      } catch (err) {
        console.error('Push subscription error:', err)
      }
    }

    subscribe()
  }, [])

  return null
}