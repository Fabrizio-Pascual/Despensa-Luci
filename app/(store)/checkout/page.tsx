'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, Banknote, FileText, Minus, Plus, Package, Trash2, AlertCircle, Loader2, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useCart } from '@/components/cart-context'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

const CAMBIO_DISPONIBLE = 5000 // referencia informativa, ya no bloquea el pedido

export default function CheckoutPage() {
  const { items, total, updateQuantity, removeFromCart, updateComboQuantity, removeCombo, clearCart, isLoading } = useCart()
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'debito' | 'boucher'>('efectivo')
  const [notes, setNotes] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [fiadoHabilitado, setFiadoHabilitado] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // El checkout revisa si el cliente tiene "Fiado" habilitado desde
  // Admin → Clientes (columna can_fiar del perfil). Es el mismo
  // sistema que ya tenías armado; la deuda se crea sola al confirmar
  // el pedido (igual que con efectivo o débito).
  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active || !user) return
      const { data, error } = await supabase.from('profiles').select('can_fiar').eq('id', user.id).single()
      if (!active) return
      if (!error) setFiadoHabilitado(Boolean(data?.can_fiar))
    })()
    return () => { active = false }
  }, [supabase])

  // Si en algún momento deja de estar habilitado y tenía "boucher" elegido,
  // lo volvemos a "efectivo" para no dejar seleccionada una opción oculta.
  useEffect(() => {
    if (!fiadoHabilitado && paymentMethod === 'boucher') setPaymentMethod('efectivo')
  }, [fiadoHabilitado, paymentMethod])

  const runPending = async (key: string, action: () => Promise<void>) => {
    if (pendingKey) return
    setPendingKey(key)
    try {
      await action()
    } finally {
      setPendingKey(null)
    }
  }

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

      const orderItems = items.map(item => item.combo_id ? ({
        order_id: order.id,
        product_id: null,
        combo_id: item.combo_id,
        combo_name: item.combo?.name || 'Combo',
        quantity: item.quantity,
        unit_price: item.combo?.price || 0,
        subtotal: (item.combo?.price || 0) * item.quantity,
      }) : ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity,
        variant_name: item.variant_name || null,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      // Si pagó con Fiado, además de la deuda nativa (que se crea sola),
      // anotamos la compra en el cuaderno de fiados para que tus
      // empleados la vean ahí también.
      if (paymentMethod === 'boucher' && user.email) {
        const resumen = items.map(item => {
          const name = item.combo_id ? (item.combo?.name || 'Combo') : item.product.name
          return `${item.quantity}x ${name}`
        }).join(', ')
        const { error: fiadoError } = await supabase.rpc('fiado_record_purchase', {
          p_email: user.email,
          p_description: `Pedido online #${order.id.slice(0, 8)}: ${resumen}`,
          p_amount: total,
          p_order_id: order.id,
        })
        if (fiadoError) console.error('fiado_record_purchase', fiadoError)
      }

      // Descontar stock — de la variante si tiene, del producto si es
      // suelto, o de cada producto que compone el combo (multiplicado por
      // la cantidad de combos pedidos) si es un combo.
      for (const item of items) {
        if (item.combo_id) {
          for (const comboItem of item.combo?.combo_items || []) {
            if (!comboItem.product) continue
            await supabase.from('products')
              .update({ stock: comboItem.product.stock - (comboItem.quantity * item.quantity) })
              .eq('id', comboItem.product_id)
          }
        } else if (item.variant_id) {
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

      try {
        await fetch('/api/notify-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, total }),
        })
      } catch {}

      await clearCart()
      toast.success('¡Pedido realizado con éxito!')
      router.push(`/dashboard/pedidos/${order.id}`)
    } catch (error) {
      // Logueamos el error real (antes se perdía por completo) para
      // poder diagnosticar problemas reales del checkout.
      console.error('[checkout] error al crear el pedido:', error)
      const message = error instanceof Error ? error.message.toLowerCase() : ''
      if (message.includes('stock') || message.includes('constraint')) {
        toast.error('Parece que se agotó algún producto de tu pedido justo ahora. Revisá tu carrito e intentá de nuevo.')
      } else if (message.includes('network') || message.includes('fetch')) {
        toast.error('Sin conexión. Revisá tu internet e intentá de nuevo.')
      } else {
        toast.error('No pudimos completar tu pedido. Intentá de nuevo en un momento — si sigue fallando, escribinos.')
      }
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
        <h1 className="text-headline-md text-foreground mb-2">Tu carrito está vacío</h1>
        <p className="text-muted-foreground mb-6">Agregá productos para hacer tu pedido</p>
        <Button className="rounded-xl" asChild><Link href="/">Ver productos</Link></Button>
      </div>
    </div>
  )

  return (
    <div className="pb-16">
      <div className="mesh-bg" />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/carrito"><ArrowLeft className="mr-2 h-4 w-4" />Volver al carrito</Link>
        </Button>
        <h1 className="text-display-lg text-foreground mb-8">Finalizar Compra</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-[24px] bg-card border border-border/40 p-6">
              <h2 className="text-headline-sm text-foreground mb-5">Tu carrito ({items.length} productos)</h2>
              <div className="space-y-4">
                {items.map((item) => {
                  const isCombo = !!item.combo_id
                  const variantId = item.variant_id || null
                  const keyBase = isCombo ? `combo-${item.combo_id}` : `${item.product_id}-${variantId ?? 'none'}`
                  const removeKey = `${keyBase}-remove`
                  const decKey = `${keyBase}-dec`
                  const incKey = `${keyBase}-inc`
                  const isRemoving = pendingKey === removeKey
                  const isDecreasing = pendingKey === decKey
                  const isIncreasing = pendingKey === incKey
                  const rowBusy = pendingKey !== null && pendingKey.startsWith(keyBase)

                  const name = isCombo ? (item.combo?.name || 'Combo') : item.product.name
                  const price = isCombo ? (item.combo?.price || 0) : item.product.price
                  const imageUrl = isCombo ? item.combo?.image_url : item.product.image_url
                  const maxQty = isCombo ? (item.combo?.available_qty ?? 99) : item.product.stock

                  const handleRemove = () => isCombo ? removeCombo(item.combo_id!) : removeFromCart(item.product_id!, variantId)
                  const handleDec = () => isCombo ? updateComboQuantity(item.combo_id!, item.quantity - 1) : updateQuantity(item.product_id!, item.quantity - 1, variantId)
                  const handleInc = () => isCombo ? updateComboQuantity(item.combo_id!, item.quantity + 1) : updateQuantity(item.product_id!, item.quantity + 1, variantId)

                  return (
                    <div key={item.id} className={`flex gap-4 py-4 border-b border-border/40 last:border-0 last:pb-0 ${rowBusy ? 'opacity-70' : ''}`}>
                      <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-muted shrink-0">
                        {imageUrl ? (
                          <Image src={imageUrl} alt={name} fill className="object-contain p-1" sizes="80px" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            {isCombo ? <Gift className="h-8 w-8 text-muted-foreground/50" /> : <Package className="h-8 w-8 text-muted-foreground/50" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-foreground">
                          {isCombo && <Gift className="inline h-4 w-4 mr-1 text-primary" />}
                          {name}
                          {item.variant_name && <span className="text-muted-foreground font-normal"> · {item.variant_name}</span>}
                        </h4>
                        <p className="text-sm text-muted-foreground">{isCombo ? 'Combo' : `${formatPrice(price)} / ${item.product.unit}`}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-3 bg-secondary/60 rounded-full px-3 py-1">
                            <button
                              className="text-primary hover:text-primary/70 premium-transition active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
                              disabled={pendingKey !== null}
                              onClick={() => runPending(decKey, handleDec)}
                            >
                              {isDecreasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Minus className="h-3.5 w-3.5" />}
                            </button>
                            <span className="text-sm font-semibold min-w-[1rem] text-center">{item.quantity}</span>
                            <button
                              className="text-primary hover:text-primary/70 premium-transition active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
                              onClick={() => runPending(incKey, handleInc)}
                              disabled={pendingKey !== null || item.quantity >= maxQty}
                            >
                              {isIncreasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-auto rounded-full text-muted-foreground hover:text-destructive"
                            disabled={pendingKey !== null}
                            loading={isRemoving}
                            onClick={() => runPending(removeKey, handleRemove)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatPrice(price * item.quantity)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[24px] bg-card border border-border/40 p-6">
              <h2 className="text-headline-sm text-foreground mb-1">Notas del pedido</h2>
              <p className="text-sm text-muted-foreground mb-4">Agregá instrucciones especiales</p>
              <Textarea
                placeholder="Ej: Quiero las gaseosas bien frías..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="rounded-xl bg-background"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[24px] bg-card border border-border/40 p-6">
              <h2 className="text-headline-sm text-foreground mb-1">Método de Pago</h2>
              <p className="text-sm text-muted-foreground mb-4">Pagás cuando retirés tu pedido</p>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)} className="space-y-3">
                <div className={`flex items-center space-x-3 p-4 rounded-2xl border premium-transition cursor-pointer ${paymentMethod === 'efectivo' ? 'border-primary bg-primary/10' : 'border-border/40 hover:bg-secondary/40'}`}>
                  <RadioGroupItem value="efectivo" id="efectivo" />
                  <Label htmlFor="efectivo" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Banknote className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Efectivo</p>
                      <p className="text-sm text-muted-foreground">Pagás en el local</p>
                    </div>
                  </Label>
                </div>

                {paymentMethod === 'efectivo' && (
                  <div className="ml-6 space-y-2 pb-1">
                    <Label className="text-sm text-foreground">¿Con cuánto vas a pagar?</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input type="number" className="pl-7 rounded-xl bg-background" placeholder={total.toString()} value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
                    </div>
                    {cashNum > 0 && !sinCambio && (
                      <div className={`rounded-xl p-3 text-sm ${cambioAlto ? 'bg-amber-950/30 border border-amber-800' : 'bg-primary/10 border border-primary/30'}`}>
                        {cambioAlto ? (
                          <div className="flex items-center gap-2 text-amber-400">
                            <AlertCircle className="h-4 w-4" />
                            <span>Vuelto: <strong>{formatPrice(cambio)}</strong>. Es un monto alto, te vamos a confirmar si hay cambio disponible.</span>
                          </div>
                        ) : cambio > 0 ? (
                          <p className="text-primary">Vuelto: <strong>{formatPrice(cambio)}</strong></p>
                        ) : (
                          <p className="text-primary">✓ Monto exacto</p>
                        )}
                      </div>
                    )}
                    {sinCambio && <p className="text-sm text-destructive">El monto es menor al total</p>}
                  </div>
                )}

                <div className={`flex items-center space-x-3 p-4 rounded-2xl border premium-transition cursor-pointer ${paymentMethod === 'debito' ? 'border-primary bg-primary/10' : 'border-border/40 hover:bg-secondary/40'}`}>
                  <RadioGroupItem value="debito" id="debito" />
                  <Label htmlFor="debito" className="flex items-center gap-3 cursor-pointer flex-1">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Débito</p>
                      <p className="text-sm text-muted-foreground">Tarjeta de débito en el local</p>
                    </div>
                  </Label>
                </div>

                {fiadoHabilitado && (
                  <div className={`flex items-center space-x-3 p-4 rounded-2xl border premium-transition cursor-pointer ${paymentMethod === 'boucher' ? 'border-primary bg-primary/10' : 'border-border/40 hover:bg-secondary/40'}`}>
                    <RadioGroupItem value="boucher" id="boucher" />
                    <Label htmlFor="boucher" className="flex items-center gap-3 cursor-pointer flex-1">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">Fiado</p>
                        <p className="text-sm text-muted-foreground">Pagás después</p>
                      </div>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>

            <div className="glass rounded-[24px] p-6">
              <h2 className="text-headline-sm text-foreground mb-4">Resumen</h2>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(total)}</span>
              </div>
              <div className="h-px bg-border/60 mb-3" />
              <div className="flex justify-between items-center mb-6">
                <span className="text-headline-sm text-foreground">Total</span>
                <span className="text-headline-sm text-primary">{formatPrice(total)}</span>
              </div>
              <Button className="w-full rounded-xl" size="lg" onClick={handleSubmit} loading={isSubmitting}>
                {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Te notificaremos cuando tu pedido esté listo para retirar 🧡
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
