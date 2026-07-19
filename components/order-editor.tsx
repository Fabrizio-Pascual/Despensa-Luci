'use client'

import { useState } from 'react'
import { Minus, Plus, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { notifyUser } from '@/lib/notify'
import { toast } from 'sonner'

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

interface EditableItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  product?: { name: string }
}

interface OrderEditorProps {
  orderId: string
  editNote: string | null
  items: EditableItem[]
  adminId: string | null
  onSaved: (newTotal: number, remainingItems: EditableItem[]) => void
}

export function OrderEditor({ orderId, editNote, items: initialItems, adminId, onSaved }: OrderEditorProps) {
  const [items, setItems] = useState<EditableItem[]>(initialItems)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const changeQty = (itemId: string, delta: number) => {
    setItems(prev =>
      prev.map(it => (it.id === itemId ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it))
    )
  }

  const removeItem = (itemId: string) => {
    setItems(prev => prev.map(it => (it.id === itemId ? { ...it, quantity: 0 } : it)))
  }

  const remaining = items.filter(it => it.quantity > 0)
  const newTotal = remaining.reduce((sum, it) => sum + it.quantity * it.unit_price, 0)

  const save = async () => {
    if (remaining.length === 0) {
      toast.error('No podés dejar el pedido vacío. Si no querés nada de esto, mejor cancelalo.')
      return
    }
    setSaving(true)
    try {
      const toDelete = items.filter(it => it.quantity === 0)
      const toUpdate = remaining.filter(it => {
        const original = initialItems.find(o => o.id === it.id)
        return original && original.quantity !== it.quantity
      })

      for (const it of toDelete) {
        const { error } = await supabase.from('order_items').delete().eq('id', it.id)
        if (error) throw error
      }
      for (const it of toUpdate) {
        const { error } = await supabase
          .from('order_items')
          .update({ quantity: it.quantity, subtotal: it.quantity * it.unit_price })
          .eq('id', it.id)
        if (error) throw error
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({ total: newTotal, edit_unlocked: false, edited_by_customer_at: new Date().toISOString() })
        .eq('id', orderId)
      if (orderError) throw orderError

      toast.success('Guardamos los cambios en tu pedido')

      if (adminId) {
        notifyUser({
          userId: adminId,
          title: '✏️ El cliente modificó su pedido',
          body: `Pedido #${orderId.slice(0, 8)} — nuevo total: ${formatPrice(newTotal)}`,
          url: `/admin/pedidos/${orderId}`,
        })
      }

      onSaved(newTotal, remaining)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo guardar. Probá de nuevo en un momento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-blue-500/40 bg-blue-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-blue-700 dark:text-blue-400">
          <Pencil className="h-4 w-4" />
          Podés editar tu pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {editNote && (
          <p className="text-sm text-muted-foreground">
            El local avisó que falta: <strong className="text-foreground">{editNote}</strong>. Sacalo o ajustá las cantidades.
          </p>
        )}

        <div className="space-y-3">
          {items.map(it => (
            <div key={it.id} className={`flex items-center justify-between gap-2 ${it.quantity === 0 ? 'opacity-40' : ''}`}>
              <div className="min-w-0">
                <p className="font-medium truncate">{it.product?.name}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(it.unit_price)} c/u</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeQty(it.id, -1)} disabled={it.quantity === 0}>
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-6 text-center font-medium">{it.quantity}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeQty(it.id, 1)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(it.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex justify-between items-center font-semibold">
          <span>Nuevo total</span>
          <span className="text-lg text-primary">{formatPrice(newTotal)}</span>
        </div>

        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : 'Confirmar cambios'}
        </Button>
      </CardContent>
    </Card>
  )
}