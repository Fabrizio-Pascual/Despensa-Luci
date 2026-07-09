'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Minus, Plus, ShoppingCart, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price)
}

interface Variant {
  id: string
  name: string
  image_url: string | null
  stock: number
  price_modifier: number
  is_active: boolean
  display_order: number
}

interface CartItemWithVariant {
  id: string
  product_id: string
  quantity: number
  variant_id?: string
  variant_name?: string
}

export function ProductCard({ product }: { product: Product }) {
  const [variants, setVariants] = useState<Variant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [cartItem, setCartItem] = useState<CartItemWithVariant | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const effectivePrice = product.price + (selectedVariant?.price_modifier || 0)
  const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock
  const effectiveImage = (selectedVariant?.image_url) ? selectedVariant.image_url : product.image_url
  const isOutOfStock = effectiveStock <= 0

  // Cargar variantes
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('display_order')
      if (data && data.length > 0) {
        setVariants(data)
        setSelectedVariant(data[0])
      }
    }
    load()
  }, [product.id, supabase])

  // Cargar item del carrito
  useEffect(() => {
    const loadCart = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('cart_items')
        .select('id, product_id, quantity, variant_id, variant_name')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .eq('variant_id', selectedVariant?.id || null)
        .maybeSingle()

      setCartItem(data)
    }
    loadCart()
  }, [product.id, selectedVariant, supabase])

  const handleAdd = async () => {
    if (isOutOfStock || isLoading) return
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Iniciá sesión para agregar productos'); return }

      const { error } = await supabase.from('cart_items').upsert({
        user_id: user.id,
        product_id: product.id,
        quantity: 1,
        variant_id: selectedVariant?.id || null,
        variant_name: selectedVariant?.name || null,
      }, { onConflict: 'user_id,product_id' })

      if (error) throw error
      setCartItem({ id: '', product_id: product.id, quantity: 1, variant_id: selectedVariant?.id, variant_name: selectedVariant?.name })
      toast.success(`${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ''} agregado`)
    } catch (err) {
      console.error(err)
      toast.error('Error al agregar al carrito')
    } finally {
      setIsLoading(false)
    }
  }

  const handleIncrement = async () => {
    if (!cartItem || cartItem.quantity >= effectiveStock || isLoading) return
    setIsLoading(true)
    try {
      await supabase.from('cart_items').update({ quantity: cartItem.quantity + 1 }).eq('id', cartItem.id)
      setCartItem({ ...cartItem, quantity: cartItem.quantity + 1 })
    } finally { setIsLoading(false) }
  }

  const handleDecrement = async () => {
    if (!cartItem || isLoading) return
    setIsLoading(true)
    try {
      if (cartItem.quantity <= 1) {
        await supabase.from('cart_items').delete().eq('id', cartItem.id)
        setCartItem(null)
      } else {
        await supabase.from('cart_items').update({ quantity: cartItem.quantity - 1 }).eq('id', cartItem.id)
        setCartItem({ ...cartItem, quantity: cartItem.quantity - 1 })
      }
    } finally { setIsLoading(false) }
  }

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md card-hover">
      <CardContent className="p-0">
        {/* Imagen */}
        <div className="relative aspect-square bg-muted">
          {effectiveImage ? (
            <Image
              src={effectiveImage}
              alt={product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="destructive">Sin stock</Badge>
            </div>
          )}
          {!isOutOfStock && effectiveStock <= 5 && (
            <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground">
              Quedan {effectiveStock}
            </Badge>
          )}
        </div>

        <div className="p-3 space-y-2">
          <div>
            <h3 className="font-medium line-clamp-2 leading-tight text-sm">{product.name}</h3>
            <p className="text-sm text-primary font-semibold mt-0.5">
              {formatPrice(effectivePrice)} / {product.unit}
            </p>
          </div>

          {/* Selector de sabores/variantes */}
          {variants.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {variants.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => { setSelectedVariant(variant); setCartItem(null) }}
                  disabled={variant.stock <= 0}
                  className={`text-xs px-2 py-1 rounded-full border transition-all ${
                    selectedVariant?.id === variant.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:border-primary'
                  } ${variant.stock <= 0 ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                >
                  {variant.name}
                </button>
              ))}
            </div>
          )}

          {/* Botón agregar */}
          {!cartItem ? (
            <Button className="w-full" size="sm" onClick={handleAdd} disabled={isOutOfStock || isLoading}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {variants.length > 0 && !selectedVariant ? 'Elegí un sabor' : 'Agregar'}
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleDecrement} disabled={isLoading}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-semibold text-base min-w-[2rem] text-center">{cartItem.quantity}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleIncrement} disabled={isLoading || cartItem.quantity >= effectiveStock}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}