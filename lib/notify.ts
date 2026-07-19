/**
 * Manda un push a un usuario puntual (cliente o admin) a través de
 * /api/push/send. Se usa desde cualquier pantalla que necesite avisarle
 * algo a alguien puntual (cambio de estado, chat, "no tengo cambio",
 * "podés editar tu pedido", etc).
 *
 * Nunca tira: si falla (sin conexión, sin suscripción, etc.) simplemente
 * no manda el push, pero no rompe la acción que se estaba haciendo.
 */
export async function notifyUser(params: {
  userId: string
  title: string
  body: string
  url?: string
}) {
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  } catch {
    // silencioso a propósito
  }
}

/** Mensajes según el nuevo estado del pedido, para mandarle al cliente. */
export const ORDER_STATUS_NOTIF: Record<string, { title: string; body: (orderId: string) => string }> = {
  preparing: {
    title: '📦 Estamos preparando tu pedido',
    body: (id) => `Pedido #${id.slice(0, 8)} — ya lo estamos armando.`,
  },
  ready: {
    title: '🛒 Tu pedido está listo',
    body: (id) => `Pedido #${id.slice(0, 8)} — podés venir a retirarlo.`,
  },
  completed: {
    title: '✅ Pedido entregado',
    body: (id) => `Pedido #${id.slice(0, 8)} — ¡gracias por tu compra!`,
  },
  cancelled: {
    title: '✗ Pedido cancelado',
    body: (id) => `Tu pedido #${id.slice(0, 8)} fue cancelado.`,
  },
}