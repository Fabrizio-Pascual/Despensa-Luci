import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:fpascual624@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: Request) {
  const { userId, title, body, url } = await req.json()
  const supabase = await createClient()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: false, error: 'No subscription' })
  }

  const payload = JSON.stringify({ title, body, url })

  await Promise.allSettled(
    subs.map(({ subscription }) =>
      webpush.sendNotification(subscription as any, payload)
    )
  )

  return NextResponse.json({ ok: true })
}