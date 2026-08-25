'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/components/cart-context'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { OrderItem, Product, Combo } from '@/lib/types'

type RepeatableItem = OrderItem & {
  product?: Pick<Product, 'id' | 'name' | 'is_active' | 'stock'> | null
}

interface RepeatOrderButtonProps {
  items: RepeatableItem[]
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm'
  className?: string
}

/**
 * Vuelve a agregar al carrito los productos de un pedido anterior.
 * Si algún producto ya no existe, está inactivo o se combo fue
 * borrado, lo salteamos y avisamos — no rompemos el resto del pedido
 * por un solo ítem faltante.
 */
export function RepeatOrderButton({ items, variant = 'outline', size = 'sm', className }: RepeatOrderButtonProps) {
  const { addToCart, addCombo } = useCart()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleRepeat = async () => {
    setLoading(true)
    let added = 0
    let skipped = 0

    try {
      for (const item of items) {
        if (item.combo_id) {
          const { data: combo } = await supabase
            .from('combos')
            .select('id, is_active')
            .eq('id', item.combo_id)
            .maybeSingle()

          if (!combo || !combo.is_active) { skipped++; continue }
          await addCombo(item.combo_id, item.quantity)
          added++
          continue
        }

        if (!item.product_id) { skipped++; continue }

        const { data: product } = await supabase
          .from('products')
          .select('id, is_active, stock')
          .eq('id', item.product_id)
          .maybeSingle()

        if (!product || !product.is_active || product.stock <= 0) { skipped++; continue }

        await addToCart(item.product_id, item.quantity)
        added++
      }

      if (added > 0) {
        toast.success(
          skipped > 0
            ? `Agregamos ${added} producto(s) al carrito. ${skipped} ya no están disponibles.`
            : 'Agregamos los productos de este pedido a tu carrito.'
        )
        router.push('/carrito')
      } else {
        toast.error('Ninguno de estos productos está disponible ahora mismo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={handleRepeat} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
      Repetir pedido
    </Button>
  )
}
