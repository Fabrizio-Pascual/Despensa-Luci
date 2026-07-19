import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Este endpoint manda un push a UN usuario puntual (por su user_id), a
 * todos los dispositivos que tenga suscriptos. Lo usan desde el navegador:
 * el chat del pedido, el aviso de "no tengo cambio", el aviso de "podés
 * editar tu pedido", etc.
 *
 * OJO: antes esta ruta no existía en el proyecto. Todo lo que llamaba a
 * /api/push/send fallaba calladito (el try/catch del cliente se comía el
 * error) y esos avisos nunca llegaban a ningún lado, ni PC ni celular.
 * Esto es lo primero que había que arreglar.
 */
export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = await req.json()

    if (!userId || !title || !body) {
      return NextResponse.json({ ok: false, error: 'faltan datos (userId, title, body)' }, { status: 400 })
    }

    // Necesitamos la Service Role para poder leer las suscripciones de
    // cualquier usuario (no solo las del que está logueado en este navegador).
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (error) {
      console.error('[push/send] error leyendo suscripciones:', error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    if (!subs || subs.length === 0) {
      // No es un error grave: puede que ese usuario nunca haya aceptado
      // las notificaciones, o las haya desactivado.
      return NextResponse.json({ ok: false, error: 'ese usuario no tiene suscripciones activas' })
    }

    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      'mailto:fpascual624@gmail.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const payload = JSON.stringify({ 
      title, 
      body, 
      url: url || '/',
      tag: 'notification',
      vibrate: [200, 100, 200],
    })

    const results = await Promise.allSettled(
      subs.map(({ subscription }) => webpush.sendNotification(subscription as any, payload))
    )

    let sent = 0
    for (const [i, r] of results.entries()) {
      if (r.status === 'fulfilled') {
        sent++
      } else {
        const statusCode = (r.reason as any)?.statusCode
        console.error('[push/send] falló un envío:', statusCode ?? r.reason)
        // 404/410 = la suscripción ya no es válida (el usuario desinstaló
        // la app, borró el navegador, etc). La limpiamos para no seguir
        // intentando en vano.
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('subscription', subs[i].subscription as any)
        }
      }
    }

    return NextResponse.json({ ok: sent > 0, sent, total: subs.length })
  } catch (error) {
    console.error('[push/send] error:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}