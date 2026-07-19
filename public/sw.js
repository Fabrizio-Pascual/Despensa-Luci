// Generar un beep de notificación con Web Audio API
function playNotificationSound() {
  try {
    const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null)
    if (!Ctx) return

    const ctx = new Ctx()
    const now = ctx.currentTime

    // Melodía simple: 2 notas (campana)
    const notes = [
      [800, 0.00, 0.15],  // Nota aguda
      [600, 0.15, 0.30],  // Nota más grave (más larga)
    ]

    notes.forEach(([freq, offset, dur]) => {
      const start = now + offset
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq

      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(start + dur + 0.02)
    })
  } catch (e) {
    console.log('No se pudo reproducir sonido:', e)
  }
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()

  // Reproducir sonido
  playNotificationSound()

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-dark-32x32.png',
      badge: '/icon-dark-32x32.png',
      vibrate: data.vibrate || [200, 100, 200, 100, 300],
      data: { url: data.url || '/' },
      tag: data.tag || 'notification',
      requireInteraction: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})