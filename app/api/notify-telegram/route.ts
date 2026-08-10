import { NextResponse } from 'next/server'

/**
 * Endpoint chiquito, solo para mandar el aviso de "pedido nuevo" por
 * Telegram. Está separado en su propia ruta (en vez de mandar el mensaje
 * directo desde el checkout, que corre en el navegador) porque el
 * TELEGRAM_BOT_TOKEN es secreto: si lo llamáramos desde el cliente,
 * cualquiera podría verlo abriendo las herramientas de desarrollador y
 * mandar mensajes falsos al grupo con nuestro bot.
 *
 * Lo llama app/(store)/checkout/page.tsx justo después de crear el pedido,
 * al mismo tiempo que manda los push a los admins.
 */
export async function POST(req: Request) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!token || !chatId) {
      // No están configuradas las variables: no rompemos el pedido por
      // esto, simplemente no mandamos el aviso.
      return NextResponse.json({ ok: false, error: 'telegram no configurado' })
    }

    const { orderId, total } = await req.json()
    const orderUrl = orderId
      ? `https://despensa-luci-puce.vercel.app/admin/pedidos/${orderId}`
      : 'https://despensa-luci-puce.vercel.app/admin'
    const totalTxt = total ? ` — $${total}` : ''

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🛒 <b>Nuevo pedido</b>${totalTxt}\n${orderUrl}`,
        parse_mode: 'HTML',
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[notify-telegram] telegram rechazó el mensaje:', res.status, body)
      return NextResponse.json({ ok: false, error: body }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[notify-telegram] error:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
