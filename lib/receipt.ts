import { jsPDF } from 'jspdf'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const paymentLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Tarjeta de Débito',
  boucher: 'Fiado (Boucher)',
}

/**
 * Genera y descarga el comprobante en PDF de un pedido.
 * Misma lógica que ya se usaba en /admin y en el detalle de pedido del cliente,
 * centralizada acá para reusarla también en el historial de facturas.
 */
export function generateReceipt(order: any) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('Despensa Luci', 105, 20, { align: 'center' })
  doc.setFontSize(12)
  doc.text('Comprobante de Venta', 105, 30, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`Pedido: #${order.id.slice(0, 8)}`, 20, 45)
  doc.text(`Fecha: ${formatDate(order.created_at)}`, 20, 52)
  doc.text(`Cliente: ${order.profile?.full_name || 'N/A'}`, 20, 59)
  doc.text(`Pago: ${paymentLabels[order.payment_method as string] || order.payment_method}`, 20, 66)

  doc.line(20, 72, 190, 72)

  doc.setFontSize(10)
  doc.text('Producto', 20, 80)
  doc.text('Cant.', 120, 80)
  doc.text('Precio', 145, 80)
  doc.text('Subtotal', 170, 80)

  let y = 88
  order.order_items?.forEach((item: any) => {
    doc.text(item.product?.name?.substring(0, 35) || 'N/A', 20, y)
    doc.text(item.quantity.toString(), 125, y)
    doc.text(formatPrice(item.unit_price), 145, y)
    doc.text(formatPrice(item.subtotal), 170, y)
    y += 7
  })

  doc.line(20, y + 2, 190, y + 2)
  doc.setFontSize(12)
  doc.text(`Total: ${formatPrice(order.total)}`, 170, y + 12, { align: 'right' })

  doc.setFontSize(10)
  doc.text('Gracias por tu compra! Vuelve pronto.', 105, y + 30, { align: 'center' })

  doc.save(`comprobante-${order.id.slice(0, 8)}.pdf`)
}
