'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, Banknote, FileText, Minus, Plus, Package, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/components/cart-context'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

const CAMBIO_DISPONIBLE = 5000 // referencia informativa, ya no bloquea el pedido

export default function CheckoutPage() {
  const { items, total, updateQuantity, removeFromCart, clearCart, isLoading } = useCart()
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'debito' | 'boucher'>('efectivo')
  const [notes, setNotes] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const cashNum = parseFloat(cashAmount) || 0
  const cambio = cashNum - total
  const sinCambio = cashNum > 0 && cashNum < total
  // Ya no bloquea el pedido: solo se usa para avisarle al admin que revise si tiene cambio
  const cambioAlto = cashNum > total && (cashNum - total) > CAMBIO_DISPONIBLE

  const handleSubmit = async () => {
    if (items.length === 0) { toast.error('Tu carrito está vacío'); return }
    if (paymentMethod === 'efectivo' && !cashAmount) { toast.error('Indicá con cuánto vas a pagar'); return }
    if (sinCambio) { toast.error('El monto es menor al total'); return }

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Debés iniciar sesión'); router.push('/auth/login'); return }

      const notaFinal = [
        notes,
        paymentMethod === 'efectivo' ? `Paga con: ${formatPrice(cashNum)}${cambio > 0 ? ` (vuelto: ${formatPrice(cambio)}${cambioAlto ? ' ⚠️ VUELTO ALTO, VERIFICAR CAMBIO DISPONIBLE' : ''})` : ''}` : ''
      ].filter(Boolean).join(' | ')

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({ user_id: user.id, status: 'pending', payment_method: paymentMethod, total, notes: notaFinal || null })
        .select().single()

      if (orderError) throw orderError

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity,
        variant_name: item.variant_name || null,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      // Descontar stock — de la variante si tiene, sino del producto
      for (const item of items) {
        if (item.variant_id) {
          const { data: variant } = await supabase.from('product_variants').select('stock').eq('id', item.variant_id).single()
          if (variant) {
            await supabase.from('product_variants').update({ stock: variant.stock - item.quantity }).eq('id', item.variant_id)
          }
        } else {
          await supabase.from('products').update({ stock: item.product.stock - item.quantity }).eq('id', item.product_id)
        }
      }

      try {
        const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true)
        for (const admin of admins || []) {
          await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: admin.id,
              title: '🛒 Nuevo pedido',
              body: `Pedido #${order.id.slice(0, 8)} — ${formatPrice(total)}`,
              url: `/admin/pedidos/${order.id}`
            })
          })
        }
      } catch {}

      await clearCart()
      toast.success('¡Pedido realizado con éxito!')
      router.push(`/dashboard/pedidos/${order.id}`)
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Error al crear el pedido')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  if (items.length === 0) return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-lg mx-auto text-center py-16">
        <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Tu carrito está vacío</h1>
        <p className="text-muted-foreground mb-6">Agregá productos para hacer tu pedido</p>
        <Button asChild><Link href="/">Ver productos</Link></Button>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Seguir comprando</Link>
      </Button>
      <h1 className="text-3xl font-bold mb-8">Finalizar pedido</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Tu carrito ({items.length} productos)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => {
                const variantId = item.variant_id || null
                return (
                  <div key={item.id} className="flex gap-4 py-4 border-b last:border-0">
                    <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {item.product.image_url ? (
                        <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">
                        {item.product.name}
                        {item.variant_name && <span className="text-muted-foreground font-normal"> · {item.variant_name}</span>}
                      </h4>
                      <p className="text-sm text-muted-foreground">{formatPrice(item.product.price)} / {item.product.unit}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product_id, item.quantity - 1, variantId)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-10 text-center font-medium">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product_id, item.quantity + 1, variantId)} disabled={item.quantity >= item.product.stock}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-destructive hover:text-destructive" onClick={() => removeFromCart(item.product_id, variantId)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(item.product.price * item.quantity)}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas del pedido</CardTitle>
              <CardDescription>Agregá instrucciones especiales</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Ej: Quiero las gaseosas bien frías..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Método de pago</CardTitle>
              <CardDescription>Pagás cuando retirés tu pedido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="efectivo" id="efectivo" />
                  <Label htmlFor="efectivo" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Banknote className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Efectivo</p>
                      <p className="text-sm text-muted-foreground">Pagás en el local</p>
                    </div>
                  </Label>
                </div>

                {paymentMethod === 'efectivo' && (
                  <div className="ml-6 space-y-2 pb-1">
                    <Label className="text-sm">¿Con cuánto vas a pagar?</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input type="number" className="pl-7" placeholder={total.toString()} value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
                    </div>
                    {cashNum > 0 && !sinCambio && (
                      <div className={`rounded-lg p-3 text-sm ${cambioAlto ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800'}`}>
                        {cambioAlto ? (
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertCircle className="h-4 w-4" />
                            <span>Vuelto: <strong>{formatPrice(cambio)}</strong>. Es un monto alto, te vamos a confirmar si hay cambio disponible.</span>
                          </div>
                        ) : cambio > 0 ? (
                          <p className="text-green-700 dark:text-green-400">Vuelto: <strong>{formatPrice(cambio)}</strong></p>
                        ) : (
                          <p className="text-green-700 dark:text-green-400">✓ Monto exacto</p>
                        )}
                      </div>
                    )}
                    {sinCambio && <p className="text-sm text-destructive">El monto es menor al total</p>}
                  </div>
                )}

                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="debito" id="debito" />
                  <Label htmlFor="debito" className="flex items-center gap-3 cursor-pointer flex-1">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Débito</p>
                      <p className="text-sm text-muted-foreground">Tarjeta de débito en el local</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="boucher" id="boucher" />
                  <Label htmlFor="boucher" className="flex items-center gap-3 cursor-pointer flex-1">
                    <FileText className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Fiado</p>
                      <p className="text-sm text-muted-foreground">Pagás después</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Procesando...' : 'Confirmar pedido'}
              </Button>
            </CardFooter>
          </Card>

          <p className="text-sm text-muted-foreground text-center">Te notificaremos cuando tu pedido esté listo para retirar 🧡</p>
        </div>
      </div>
    </div>
  )
}