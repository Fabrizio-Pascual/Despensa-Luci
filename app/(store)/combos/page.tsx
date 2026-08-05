'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Gift, ShoppingBag, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/cart-context'
import type { Combo } from '@/lib/types'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const { addCombo } = useCart()

  useEffect(() => {
    const load = async () => {
      const { data: combosData } = await supabase
        .from('combos')
        .select('*, combo_items(*, product:products(*))')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const { data: availability } = await supabase.from('combo_availability_view').select('*')
      const availMap = new Map((availability || []).map(a => [a.combo_id, a.available_qty]))

      setCombos((combosData || []).map(c => ({ ...c, available_qty: availMap.get(c.id) ?? 0 })))
      setIsLoading(false)
    }
    load()
  }, [supabase])

  const handleAdd = async (comboId: string) => {
    setAddingId(comboId)
    try {
      await addCombo(comboId, 1)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="pb-20 md:pb-8">
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumbs items={[{ label: 'Combos', href: '/combos', current: true }]} />
      </div>

      <section className="container mx-auto px-4 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
          <Gift className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">COMBOS</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Combos con precio especial</h1>
        <p className="text-muted-foreground">Elegimos productos que combinan bien y les ponemos un precio fijo, más conveniente que comprarlos por separado.</p>
      </section>

      {isLoading ? (
        <div className="container mx-auto px-4 flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : combos.length === 0 ? (
        <section className="container mx-auto px-4">
          <div className="glass rounded-lg border border-border p-12 text-center">
            <Gift className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sin combos activos</h2>
            <p className="text-muted-foreground mb-6">Vuelve pronto para ver nuestros combos</p>
            <Button asChild>
              <Link href="/categorias" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Ver Todos los Productos
              </Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {combos.map((combo) => {
              const soldOut = (combo.available_qty ?? 0) <= 0
              const isAdding = addingId === combo.id
              return (
                <div key={combo.id} className="rounded-[24px] bg-card border border-border/40 overflow-hidden premium-transition hover:shadow-warm">
                  <div className="relative h-40 bg-muted">
                    {combo.image_url ? (
                      <Image src={combo.image_url} alt={combo.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 300px" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Gift className="h-12 w-12 text-muted-foreground/40" />
                      </div>
                    )}
                    {soldOut && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <span className="text-sm font-semibold text-muted-foreground">Sin stock por ahora</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-foreground mb-1">{combo.name}</h3>
                    {combo.description && <p className="text-sm text-muted-foreground mb-2">{combo.description}</p>}
                    <p className="text-sm text-muted-foreground mb-3">
                      {(combo.combo_items || []).map(ci => `${ci.quantity > 1 ? ci.quantity + '× ' : ''}${ci.product?.name}`).join(' + ')}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">{formatPrice(combo.price)}</span>
                      <Button
                        size="sm"
                        className="gap-1.5 rounded-xl"
                        disabled={soldOut || isAdding}
                        onClick={() => handleAdd(combo.id)}
                      >
                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Agregar
                      </Button>
                    </div>
                    {!soldOut && (combo.available_qty ?? 0) <= 3 && (
                      <p className="text-xs text-amber-500 mt-2">¡Quedan pocos! ({combo.available_qty})</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
