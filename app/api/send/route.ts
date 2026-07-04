import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = await req.json()
    const supabase = await createClient()

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: false, error: 'No subscription' })
    }

    // Importar web-push dinámicamente para evitar errores en build
    const webpush = (await import('web-push')).default

    webpush.setVapidDetails(
      'mailto:fpascual624@gmail.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const payload = JSON.stringify({ title, body, url })

    await Promise.allSettled(
      subs.map(({ subscription }) =>
        webpush.sendNotification(subscription as any, payload)
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Push error:', error)
    return NextResponse.json({ ok: false, error: String(error) })
  }
}