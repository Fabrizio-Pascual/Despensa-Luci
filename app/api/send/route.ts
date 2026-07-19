import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Este endpoint lo llama un Database Webhook de Supabase (gratis, se
 * configura desde el dashboard, sin código) cada vez que se INSERTA una
 * fila nueva en la tabla `orders`. No lo llama el navegador del cliente:
 * así el aviso sale sí o sí, aunque el cliente cierre la pestaña apenas
 * hace el pedido, se le corte el wifi, etc.
 *
 * Busca a TODOS los admins (profiles.is_admin = true) y les manda un
 * push a cada dispositivo que tengan suscripto (celular, PC, lo que sea).
 */
export async function POST(req: Request) {
  try {
    // Verificamos un secreto compartido para que no cualquiera pueda
    // pegarle a este endpoint y hacerlo mandar notificaciones falsas.
    const secret = req.headers.get('x-webhook-secret')
    if (secret !== process.env.ORDER_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const payload = await req.json()
    // Formato estándar de un Database Webhook de Supabase: { record: {...} }
    const order = payload.record ?? payload

    // Client con la Service Role: esto corre en el servidor, no en el
    // navegador, así que puede saltarse RLS para leer todos los admins
    // y todas las suscripciones (nunca exponer esta key al cliente).
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true)

    if (!admins || admins.length === 0) {
      return NextResponse.json({ ok: false, error: 'no admins' })
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .in('user_id', admins.map(a => a.id))

    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: false, error: 'no subscriptions' })
    }

    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      'mailto:fpascual624@gmail.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const total = order?.total ? `$${order.total}` : ''
    const notifPayload = JSON.stringify({
      title: '🛒 Nuevo pedido',
      body: `Pedido nuevo${total ? ' por ' + total : ''}. Tocá para verlo.`,
      url: order?.id ? `/admin/pedidos/${order.id}` : '/admin',
    })

    const results = await Promise.allSettled(
      subs.map(({ subscription }) =>
        webpush.sendNotification(subscription as any, notifPayload)
      )
    )

    // Si alguna suscripción está vencida/inválida (410/404), no hacemos
    // nada especial: la próxima vez que ese admin abra /admin con el
    // permiso ya concedido, PushSubscriber la vuelve a crear sola
    // (hace upsert por user_id). Solo lo dejamos loggeado para saberlo.
    results.forEach((r) => {
      if (r.status === 'rejected') {
        console.error('push falló para una suscripción:', r.reason?.statusCode ?? r.reason)
      }
    })

    return NextResponse.json({ ok: true, sent: subs.length })
  } catch (error) {
    console.error('notify-new-order error:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
